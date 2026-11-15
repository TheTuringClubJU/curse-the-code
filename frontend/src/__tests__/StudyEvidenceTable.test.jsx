import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import Evidence from '../game/components/study/StudyEvidenceTable.jsx';
afterEach(cleanup);
const record={id:'ES01',is_wrapped:false,display:{title:'Recovered letter',lines:['Exact public evidence line.']},secret:{chunk:'PUBLIC CIPHER CHUNK'}};
it('keeps records sealed until server unlock',()=>{render(<Evidence isOpen evidence={[record]} collectedIds={['ES01']} onClose={()=>{}}/>);expect(screen.queryByText('Exact public evidence line.')).toBeNull();fireEvent.click(screen.getByRole('button',{name:/Examine wrapped/}));expect(screen.queryByText('PUBLIC CIPHER CHUNK')).toBeNull();});
it('shows actual backend text without placeholder images',()=>{const {container}=render(<Evidence isOpen basketUnlocked evidence={[record]} collectedIds={['ES01']} onClose={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Examine Recovered letter'}));expect(screen.getByText('Exact public evidence line.')).toBeInTheDocument();expect(screen.getByText('PUBLIC CIPHER CHUNK')).toBeInTheDocument();expect(container.querySelector('img')).toBeNull();});
it('Escape returns from sheet then closes table',()=>{const close=vi.fn();render(<Evidence isOpen basketUnlocked evidence={[record]} collectedIds={['ES01']} onClose={close}/>);fireEvent.click(screen.getByRole('button',{name:'Examine Recovered letter'}));fireEvent.keyDown(window,{key:'Escape'});expect(close).not.toHaveBeenCalled();fireEvent.keyDown(window,{key:'Escape'});expect(close).toHaveBeenCalledOnce();});
