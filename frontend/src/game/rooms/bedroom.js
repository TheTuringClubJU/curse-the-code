// Room config: haunted Halloween bedroom (blue/violet theme). Scene detail lives in src/scene.js + src/decor.js.
export default {
 id:'bedroom',title:"Lena's Bedroom",size:[8,3,6],spawn:[0.8,1.8,0],haunted:true,
 theme:{bg:'#140d26',wall:'#4a3f73',floor:'#8a7aa8',ceil:'#241a42',accent:'#8f7bff',glow:'#cdbfff',lamp:'#ffcf8a',moon:'#9db8ff'},
 window:{z:-0.8,w:1.6,y0:1,y1:2.3},
 lamp:{pos:[3.0,1.3,-2.5],shadow:true},
 clock:{pos:[2.7,2.3,-2.95]},
 audio:{tick:true,every:[16,38],whisperCooldown:50,clock:[2.7,-2.95],voices:['seeyou','getout','behind','rex']},
 interact:{diary:{label:'Inspect Diary'},musicbox:{label:'Listen to Music Box'},poster:{label:'Inspect Poster'}},
 boxes:[]}
