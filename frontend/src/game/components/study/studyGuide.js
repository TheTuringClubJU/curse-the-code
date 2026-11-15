export const STUDY_CASE_ORDER=['R1-05','R1-06','R1-07','R1-08'];
export const STUDY_PROPS={
 tablet_drawer:['Console drawer','Beneath the map on the west wall'],crt_monitor:['Computer screen','The screen on the main desk'],terminal_pc:['Computer keyboard','The base and keyboard of the same computer'],line_printer:['Matrix printer','The printer on the main desk'],
 bookshelf:['Bookshelf','The west archive wall'],corkboard:['Corkboard','The east wall beside the recorder'],desk_blotter:['Desk blotter','The leather writing mat on the main desk'],filing_cabinet:['Archive cabinet','The carved cabinet beside the west console'],sticky_wall:['Wall notes','The notes beside the map'],armchair:['Desk chair','Behind the main desk'],reel_recorder:['Tape recorder','The southeast recording corner'],cable_bundle:['Cable bundle','Beside the main desk'],floor_lamp:['Console lamp','The lamp beneath the map'],wastebin:['Waste bin','Beside the desk chair'],window:['Window sill','The east window'],radiator:['Radiator','Beneath the east window']
};
export const studyPropName=id=>STUDY_PROPS[id]?.[0]||id?.replaceAll('_',' ')||'Study';
export const studyResolved=c=>Boolean(c.solved||c.exhausted||(c.attempts_max!==null&&(c.attempts||0)>=(c.attempts_max??3)));
export const studyCases=clues=>STUDY_CASE_ORDER.map(id=>clues?.find(c=>c.id===id)).filter(Boolean);
export function studyObjective(room={}){
 const total=room.total_fragments_in_room||16,count=room.collected_fragment_ids?.length||0,cases=studyCases(room.clues),next=cases.find(c=>!studyResolved(c)),resolved=cases.filter(studyResolved).length;
 if(room.is_completed)return {phase:'exit',step:3,title:'Enter the Basement',detail:'The case files are resolved. Go to the north door and press E.',progress:'Passage unlocked'};
 if(!room.basket_unlocked)return {phase:'search',step:1,title:'Recover the sealed evidence',detail:'Search objects with E. Recover every sealed fragment before opening their contents.',extra:'Some objects hold more than one record or unlock after earlier discoveries. H opens the shared hint service; new hints carry tournament penalties.',progress:`${count} / ${total} recovered`};
 if(!next)return {phase:'sync',step:2,title:'Verify the case files',detail:'All files are resolved. Reconnect to confirm Basement access.',progress:`${resolved} / ${cases.length||4} resolved`};
 return {phase:'cases',step:2,title:`Investigate the ${studyPropName(next.object_id).toLowerCase()}`,detail:`Read the recovered records in Basket (B), then open this case in Case Files (C) or inspect its object with E.`,extra:'Arrange its related scraps, interpret the evidence, then submit your deduction. Collecting fragments alone does not unlock the door.',progress:`${resolved} / ${cases.length||4} case files resolved`,clue:next};
}
