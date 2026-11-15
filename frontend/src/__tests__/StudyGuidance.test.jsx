import React from 'react';
import {it, expect, vi, afterEach} from 'vitest';
import {render, screen, fireEvent, cleanup, waitFor} from '@testing-library/react';
import {studyObjective} from '../game/components/study/studyGuide.js';
import Cases from '../game/components/study/StudyCaseFiles.jsx';
import Hints from '../game/components/study/StudyHints.jsx';
const clues = ['tablet_drawer','crt_monitor','terminal_pc','line_printer'].map((object_id,i) => ({id:'R1-0'+(i+5),object_id,solved:false,attempts:0,attempts_max:3,is_locked:i>0}));
const hintStatus = {hints_remaining:15, total_budget:15, total_penalty_seconds:0, unlocked_hints:[]};
afterEach(() => {cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks();});
function mockHints(result, status = hintStatus) {
  vi.stubGlobal('fetch', vi.fn(async url => ({ok:true, json:async () => url.endsWith('/status') ? status : result})));
}
async function requestButton() {
  const button = await screen.findByRole('button', {name:'Request next hint'});
  await waitFor(() => expect(button).toBeEnabled());
  return button;
}

it('explains collection using the existing room response without guessing the next object', () => {
  const guide = studyObjective({collected_fragment_ids:['ES01'],total_fragments_in_room:16,basket_unlocked:false});
  expect(guide.phase).toBe('search'); expect(guide.detail).toContain('Search objects with E');
  expect(guide.progress).toBe('1 / 16 recovered'); expect(guide.extra).toContain('tournament penalties');
  expect(guide.detail).not.toContain('Current lead');
});
it('does not mistake all fragments for an unlocked door', () => {
  const guide = studyObjective({basket_unlocked:true,clues});
  expect(guide.phase).toBe('cases'); expect(guide.title).toContain('console drawer');
  expect(guide.detail).toContain('Basket (B)'); expect(guide.extra).toContain('does not unlock');
});
it('advances cases after exhaustion but trusts only server completion for exit', () => {
  const cases = structuredClone(clues); cases[0].attempts=3; cases[1].is_locked=false;
  expect(studyObjective({basket_unlocked:true,clues:cases}).clue.id).toBe('R1-06');
  cases.forEach(c => c.solved=true);
  expect(studyObjective({basket_unlocked:true,clues:cases}).phase).toBe('sync');
  expect(studyObjective({is_completed:true}).phase).toBe('exit');
});
it('case files explain the next prerequisite in plain object names', () => {
  render(<Cases isOpen basketUnlocked clues={clues} onClose={()=>{}} onOpenClue={()=>{}}/>);
  expect(screen.getByRole('button',{name:'Open Console drawer'})).toBeEnabled();
  expect(screen.getByRole('button',{name:'Open Computer screen'})).toBeDisabled();
  expect(screen.getAllByText(/Resolve Console drawer first/)).toHaveLength(3);
});
it('shows the shared hint economy from the first request without a free allowance', async () => {
  mockHints({success:true}); render(<Hints isOpen roomData={{}} onClose={()=>{}}/>);
  await requestButton();
  expect(screen.getByText(/New search hint: \+10s/)).toHaveTextContent('New puzzle hint: +30s');
  expect(screen.getByText(/New search hint: \+10s/)).toHaveTextContent('15 points');
  expect(screen.queryByText(/first two|free Study hints|Current hint: free/i)).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it.each([['fragment',10],['clue',30]])('displays the server cost for a %s hint and refreshes status', async (category, penalty) => {
  mockHints({success:true,hint_category:category,is_free:false,penalty_applied:penalty,hint_text:'Guidance returned by the shared service.'});
  render(<Hints isOpen roomData={{basket_unlocked:true,clues}} onClose={()=>{}}/>);
  fireEvent.click(await requestButton());
  expect(await screen.findByText('Guidance returned by the shared service.')).toBeInTheDocument();
  expect(screen.getByText(`+${penalty}s applied by the server`)).toBeInTheDocument();
  const request = fetch.mock.calls.find(([url]) => url.endsWith('/hint'));
  expect(request[1]).toMatchObject({method:'POST',credentials:'include',body:'{"room_id":"study"}'});
  await waitFor(() => expect(fetch.mock.calls.filter(([url]) => url.endsWith('/status'))).toHaveLength(2));
});
it('renders centralized location, puzzle type and guidance without replacing the text', async () => {
  mockHints({success:true,is_free:false,penalty_applied:30,hint_details:{title:'Server case title',location_prop:'Server prop location',puzzle_type:'Server puzzle type',guidance:'Exact shared solving guidance.'}});
  render(<Hints isOpen roomData={{basket_unlocked:true,clues}} onClose={()=>{}}/>);
  fireEvent.click(await requestButton());
  expect(await screen.findByText('Exact shared solving guidance.')).toBeInTheDocument();
  for (const text of ['Server case title','Server prop location','Server puzzle type']) expect(screen.getByText(text)).toBeInTheDocument();
});
it('keeps unlocked history readable at zero budget without another request', async () => {
  mockHints({}, {...hintStatus,hints_remaining:0,unlocked_hints:[
    {room_id:'study',target_id:'ES01',hint_category:'fragment',penalty_seconds:10,hint_text:'Previously purchased Study lead.'},
    {room_id:'bedroom',target_id:'EB01',hint_text:'Other room lead.'}
  ]});
  render(<Hints isOpen roomData={{}} onClose={()=>{}}/>);
  expect(await screen.findByText('Previously purchased Study lead.')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button',{name:'Request next hint'})).toBeDisabled());
  expect(screen.queryByText('Other room lead.')).toBeNull(); expect(fetch).toHaveBeenCalledTimes(1);
});
it('labels a re-inspection free only when the shared server confirms it', async () => {
  mockHints({success:true,is_free:true,penalty_applied:0,hint_text:'An already unlocked lead.'});
  render(<Hints isOpen roomData={{}} onClose={()=>{}}/>); fireEvent.click(await requestButton());
  expect(await screen.findByText('Re-inspected ? no new penalty')).toBeInTheDocument();
});
it('does not enable purchases while the shared hint status is unavailable', async () => {
  vi.stubGlobal('fetch',vi.fn(async () => ({ok:false})));
  render(<Hints isOpen roomData={{}} onClose={()=>{}}/>);
  await screen.findByRole('alert'); expect(screen.getByRole('button',{name:'Request next hint'})).toBeDisabled();
});
it('shows the server rejection rather than claiming a hint was unlocked', async () => {
  vi.stubGlobal('fetch',vi.fn(async url => url.endsWith('/status') ? {ok:true,json:async()=>hintStatus} : {ok:false,json:async()=>({detail:{message:'Tournament hint budget exhausted.'}})}));
  render(<Hints isOpen roomData={{}} onClose={()=>{}}/>); fireEvent.click(await requestButton());
  expect(await screen.findByRole('alert')).toHaveTextContent('Tournament hint budget exhausted.');
  expect(screen.queryByRole('status')).toBeNull();
});
