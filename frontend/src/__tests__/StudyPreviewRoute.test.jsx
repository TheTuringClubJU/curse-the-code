import React from 'react';
import {it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import App from '../App.jsx';
import {checkAuthStatus} from '../userlogin/authApi';

vi.mock('../userlogin/authApi',()=>({checkAuthStatus:vi.fn(),logoutTeam:vi.fn()}));
vi.mock('../userlogin/UserLogin',()=>({default:({onLoginSuccess})=><button onClick={()=>onLoginSuccess({id:14})}>Sign in</button>}));
vi.mock('../lobby/Lobby',()=>({default:()=> <div>Lobby</div>}));
vi.mock('../admin/AdminLogin',()=>({default:()=>null}));
vi.mock('../admin/AdminDashboard',()=>({default:()=>null}));
vi.mock('../game/Room1Bedroom',()=>({default:()=> <div>Bedroom</div>}));
vi.mock('../game/Room2Study',()=>({default:({onTransitionToRoom1,onTransitionToRoom3})=><div>Study<button onClick={onTransitionToRoom1}>Return</button><button onClick={onTransitionToRoom3}>Basement door</button></div>}));
vi.mock('../game/Room3Basement',()=>({default:()=> <div>Basement</div>}));
vi.mock('../game/Room4Records',()=>({default:()=> <div>Archive</div>}));

beforeEach(()=>{
  vi.stubEnv('DEV',true);
  localStorage.setItem('ctc_current_room','basement');
  vi.mocked(checkAuthStatus).mockResolvedValue({ok:true,team:{id:14}});
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({round_status:'live',current_round:1,is_completed:false})})));
});
afterEach(()=>{cleanup();window.history.replaceState({},'','/');localStorage.clear();vi.unstubAllEnvs();vi.unstubAllGlobals();vi.clearAllMocks();});

it.each(['/study','/room2'])('opens %s locally without replacing saved room progress',async path=>{
  window.history.replaceState({},'',path);render(<App/>);
  expect(await screen.findByText('Study')).toBeInTheDocument();
  expect(localStorage.getItem('ctc_current_room')).toBe('basement');
  expect(fetch.mock.calls.some(([url])=>url==='/api/game/room/basement')).toBe(false);
});
it('keeps sign-in required and enters Study after signing in',async()=>{
  window.history.replaceState({},'','/study');vi.mocked(checkAuthStatus).mockResolvedValue(null);render(<App/>);
  const login=await screen.findByText('Sign in');expect(screen.queryByText('Study')).not.toBeInTheDocument();
  fireEvent.click(login);expect(await screen.findByText('Study')).toBeInTheDocument();
});
it('keeps the Study back and forward navigation usable in local review',async()=>{
  window.history.replaceState({},'','/study');const view=render(<App/>);await screen.findByText('Study');
  fireEvent.click(screen.getByText('Return'));expect(await screen.findByText('Bedroom')).toBeInTheDocument();
  view.unmount();render(<App/>);await screen.findByText('Study');fireEvent.click(screen.getByText('Basement door'));
  expect(await screen.findByText('Basement')).toBeInTheDocument();
});
it('keeps the normal homepage resume behavior',async()=>{
  window.history.replaceState({},'','/');render(<App/>);expect(await screen.findByText('Basement')).toBeInTheDocument();
});
it('disables the Study preview shortcut in production',async()=>{
  vi.stubEnv('DEV',false);window.history.replaceState({},'','/study');render(<App/>);
  expect(await screen.findByText('Basement')).toBeInTheDocument();
});
