import assert from 'node:assert/strict';
import {tourPosition,TOUR_KEY} from '../public/quick-tour.js';

for(const width of [280,320,375,760,1280]){
  for(const height of [320,667,900]){
    for(const top of [10,height-70]){
      for(const left of [0,width-60]){
        const card={width:Math.min(320,width-24),height:220};
        const position=tourPosition({left,top,width:60,height:50,bottom:top+50},card,{width,height});
        assert.ok(position.left>=12&&position.left+card.width<=width-12);
        assert.ok(position.top>=12&&position.top+card.height<=height-12);
        assert.ok(position.arrow>=22&&position.arrow<=card.width-22);
      }
    }
  }
}
const zoomed=tourPosition({left:120,top:520,width:70,bottom:570},{width:276,height:220},{left:80,top:300,width:300,height:400});
assert.ok(zoomed.left>=92&&zoomed.top>=312);
assert.equal(TOUR_KEY,'morada-quick-tour-v1');
console.log('PASS: floating labels fit phone, desktop, landscape and offset/zoomed viewports.');
