import React from 'react';
import {it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import App from '../App.jsx';
import {checkAuthStatus} from '../userlogin/authApi';

vi.mock('../userlogin/authApi', () => ({checkAuthStatus:vi.fn(),logoutTeam:vi.fn(),quickLoginTeam:vi.fn()}));
vi.mock('../userlogin/UserLogin', () => ({default:() => <div>Team sign in</div>}));
vi.mock('../lobby/Lobby', () => ({default:() => <div>Waiting lobby</div>}));
vi.mock('../admin/AdminLogin', () => ({default:() => null}));
vi.mock('../admin/AdminDashboard', () => ({default:() => null}));
vi.mock('../game/Room1Bedroom', () => ({default:() => <div>Bedroom room</div>}));
vi.mock('../game/Room2Study', () => ({default:() => <div>Study room</div>}));
vi.mock('../game/Room3Basement', () => ({default:() => <div>Basement room</div>}));
vi.mock('../game/Room4Records', () => ({default:() => <div>Archive room</div>}));

let state;
beforeEach(() => {
  state = {round_status:'live',current_round:1,study:false,basement:false,basementComplete:false};
  localStorage.clear();
  vi.stubEnv('DEV', true);
  vi.mocked(checkAuthStatus).mockResolvedValue({ok:true,team:{id:14}});
  vi.stubGlobal('fetch', vi.fn(async url => {
    if (url === '/api/lobby/state') return {ok:true,json:async()=>state};
    if (url === '/api/game/room/basement') return {ok:state.basement,json:async()=>({is_completed:state.basementComplete})};
    if (url === '/api/game/room/study') return {ok:state.study,json:async()=>({room_id:'study'})};
    throw Error('Unexpected API request: '+url);
  }));
});
afterEach(() => {
  cleanup();window.history.replaceState({},'','/');localStorage.clear();
  vi.unstubAllEnvs();vi.unstubAllGlobals();vi.clearAllMocks();
});

it.each(['/','/study','/room2'])('requires authentication at %s', async path => {
  vi.mocked(checkAuthStatus).mockResolvedValue(null);
  window.history.replaceState({},'',path);render(<App/>);
  expect(await screen.findByText('Team sign in')).toBeInTheDocument();
  expect(screen.queryByText('Study room')).toBeNull();
});
it.each(['/study','/room2'])('does not bypass the round gate at %s in development', async path => {
  state.round_status='pending';localStorage.setItem('ctc_current_room','study');
  window.history.replaceState({},'',path);render(<App/>);
  expect(await screen.findByText('Waiting lobby')).toBeInTheDocument();
  expect(screen.queryByText('Study room')).toBeNull();
});
it.each(['/study','/room2'])('does not bypass server room permissions at %s', async path => {
  window.history.replaceState({},'',path);render(<App/>);
  expect(await screen.findByText('Bedroom room')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith('/api/game/room/basement',expect.any(Object));
  expect(fetch).toHaveBeenCalledWith('/api/game/room/study',expect.any(Object));
});
it('enters Study through the normal live-round and server-access checks', async () => {
  state.study=true;window.history.replaceState({},'','/');render(<App/>);
  expect(await screen.findByText('Study room')).toBeInTheDocument();
});
it('resumes Basement when the backend grants access', async () => {
  state.basement=true;render(<App/>);
  expect(await screen.findByText('Basement room')).toBeInTheDocument();
});
it('returns to the lobby after server-confirmed Basement completion', async () => {
  state.basement=true;state.basementComplete=true;render(<App/>);
  expect(await screen.findByText('Waiting lobby')).toBeInTheDocument();
});
it('keeps Round 2 routing even at the former Study URL', async () => {
  state.current_round=2;window.history.replaceState({},'','/study');render(<App/>);
  expect(await screen.findByText('Archive room')).toBeInTheDocument();
  expect(screen.queryByText('Study room')).toBeNull();
});
