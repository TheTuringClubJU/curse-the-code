import {describe, it, expect, vi} from 'vitest';
import {createStudyQuality} from '../game/engine/studyQuality.js';

describe('Study rendering budget', () => {
  it('requires sustained slow frames before reducing canvas resolution', () => {
    const renderer = {setPixelRatio: vi.fn()}, quality = createStudyQuality(renderer);
    for(let i=0;i<44;i++)quality.tick(40);
    expect(renderer.setPixelRatio).not.toHaveBeenCalled();
    quality.tick(40);
    expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(.9);
    for(let i=0;i<450;i++)quality.tick(40);
    expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(.6);
  });
  it('ignores menu pauses and long tab/background stalls', () => {
    const renderer = {setPixelRatio: vi.fn()}, quality = createStudyQuality(renderer);
    for(let i=0;i<100;i++){quality.tick(60,true);quality.tick(1000);}
    expect(renderer.setPixelRatio).not.toHaveBeenCalled();
  });
  it('recovers detail on sustained fast frames without exceeding native resolution', () => {
    const renderer = {setPixelRatio: vi.fn()}, quality = createStudyQuality(renderer,.8);
    for(let i=0;i<45;i++)quality.tick(40);
    expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(.7);
    for(let i=0;i<450;i++)quality.tick(16);
    expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(.8);
  });
});
