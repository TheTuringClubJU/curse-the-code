from concurrent.futures import ThreadPoolExecutor
from app.game import hint_service


def hint(study, target_id=None):
    payload={'room_id':'study'}
    if target_id:payload['target_id']=target_id
    r=study.client.post('/api/game/hint',json=payload)
    assert r.status_code==200,r.text
    return r.json()


def test_lead_advances_using_real_prerequisites_without_revealing_wrapped_data(study):
    first=study.state()['investigation']['next_search']
    assert first['object_id']=='bookshelf'
    locked=study.search('armchair').json()
    assert locked['locked'] and locked['next_search']==first
    assert 'Bookshelf' in locked['message']
    assert study.search(first['object_id']).json()['found']
    state=study.state()
    assert state['investigation']['next_search']['object_id']=='corkboard'
    assert state['evidence'][0]['source_object_id']=='bookshelf'
    assert 'secret' not in state['evidence'][0] and 'lines' not in state['evidence'][0]['display']


def test_first_two_new_study_hints_free_then_search_costs_time_and_rereads_free(study):
    a=hint(study);assert a['target_id']=='ES01' and a['penalty_applied']==0
    assert hint(study)['hints_used']==1
    study.search('bookshelf')
    b=hint(study);assert b['target_id']=='ES02' and b['penalty_applied']==0
    study.search('corkboard')
    c=hint(study);assert c['target_id']=='ES03' and c['penalty_applied']==10
    assert hint(study)['penalty_applied']==0
    status=study.client.get('/api/game/hint/status').json()
    assert status['hints_used']==3 and status['study_policy']['free_remaining']==0
    assert status['total_penalty_seconds']==10


def test_free_puzzle_hint_does_not_deduct_solve_points(ready):
    h=hint(ready);assert h['target_id']=='R1-05' and h['penalty_applied']==0
    assert ready.submit().json()['solved']
    assert ready.progress()[0]['score']==100


def test_paid_puzzle_hint_uses_existing_time_and_score_rules(study):
    hint(study);study.search('bookshelf');hint(study)
    study.seed_fragments()
    h=hint(study);assert h['target_id']=='R1-05' and h['penalty_applied']==30 and h['point_deduction_on_solve']==15
    assert study.submit().json()['solved']
    assert study.progress()[0]['score']==85
    assert study.sql('SELECT penalty_seconds FROM team_rounds WHERE team_id=%s AND round=1',study.id)[0]['penalty_seconds']==30


def test_hints_include_both_final_window_and_radiator_scraps(study):
    study.seed_fragments(study.room['evidence'][:-2])
    assert hint(study)['target_id']=='XS01'
    study.search('window')
    assert hint(study)['target_id']=='XS02'
    study.search('radiator')
    assert hint(study)['target_id']=='R1-05'


def test_concurrent_study_requests_share_one_free_hint_and_one_budget_entry(study):
    with ThreadPoolExecutor(max_workers=4) as pool:
        results=list(pool.map(lambda _:hint_service.request_hint(study.id,'study'),range(4)))
    assert {r['target_id'] for r in results}=={'ES01'}
    assert all(r['penalty_applied']==0 for r in results)
    assert len(study.sql('SELECT * FROM team_hints WHERE team_id=%s',study.id))==1


def test_other_room_hint_cost_is_unchanged(study):
    h=study.client.post('/api/game/hint',json={'room_id':'bedroom'}).json()
    assert h['penalty_applied']==30


def test_future_hint_target_cannot_bypass_sequence(study):
    r=study.client.post('/api/game/hint',json={'room_id':'study','target_id':'R1-08'})
    assert r.status_code==400
    assert study.sql('SELECT * FROM team_hints WHERE team_id=%s',study.id)==[]


def test_budget_still_caps_new_study_hints_but_allows_history(study):
    first=hint(study)
    for i in range(14):
        study.sql("INSERT INTO team_hints (team_id,round,room_id,hint_category,target_id,penalty_seconds,hint_text) VALUES (%s,1,'bedroom','fragment',%s,10,'old lead')",study.id,'old-'+str(i))
    assert hint(study,first['target_id'])['penalty_applied']==0
    study.search('bookshelf')
    assert study.client.post('/api/game/hint',json={'room_id':'study'}).status_code==403


def test_room_access_is_required_before_study_hint_purchase(study):
    study.sql("UPDATE team_rooms SET is_completed=FALSE WHERE team_id=%s AND room_id='bedroom'",study.id)
    assert study.client.post('/api/game/hint',json={'room_id':'study'}).status_code==403
    assert study.sql('SELECT * FROM team_hints WHERE team_id=%s',study.id)==[]
