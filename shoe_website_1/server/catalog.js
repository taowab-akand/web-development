const specs = [
 ['aero-01','Aero One',8490,'Sneakers','Signature','black','#242424','Carbon / Ember','A sculptural everyday silhouette. Breathable engineered mesh meets a responsive, cloud-soft sole.'],
 ['velocity-02','Velocity Knit',6990,'Running','New arrival','white','#d9d8d1','Chalk / Silver','Light on your feet. A seamless knit upper and adaptive support made for your daily miles.'],
 ['orbit-03','Orbit Low',7490,'Casual','Bestseller','neutral','#b3a08b','Sand / Stone','Understated by design. Clean lines, considered materials and all-day cushioning.'],
 ['pulse-04','Pulse Runner',8990,'Sports','Performance','blue','#2455ca','Cobalt / Blue','An energetic ride for the long way home. Precision grip and breathable support.'],
 ['terrain-05','Terrain High',10990,'Boots','Limited edition','olive','#66714e','Olive / Moss','Built for a different path. Elevated ankle support and a durable all-terrain outsole.'],
 ['studio-06','Studio Classic',5990,'Formal','Essential','black','#252525','Black / Carbon','A modern classic for every day. A refined profile with a soft, supportive footbed.'],
 ['apex-07','Apex Carbon',14990,'Running','Limited edition','silver','#b8bdaf','Silver / Volt','Our most focused running silhouette. A propulsive profile designed to move you forward.'],
 ['drift-08','Drift Slide',3490,'Sandals','New arrival','neutral','#c2b09a','Dune / Sand','Recovery mode, elevated. An easy slip-on silhouette and contoured cushioning.']
];
export const initialProducts=specs.map(([id,name,price,category,tag,color,hex,colorway,description],i)=>({id,name,price,originalPrice:i===1?7990:i===5?6990:null,category,tag,brand:'AERFORM',gender:i===7?'Unisex':i%3===1?'Women':'Unisex',image:`/products/${id}.svg`,images:[`/products/${id}.svg`],colors:[{name:color,hex}],colorway,sizes:[38,39,40,41,42,43,44,45],rating:0,reviewCount:0,description,features:['Engineered comfort','Responsive cushioning','Precision traction'],material:'Engineered textile upper / rubber outsole',weight:'280 g (EU 42)'}));
export async function ensureSeed(db){
 const now=new Date().toISOString();
 const statements=[];
 for(const p of initialProducts){
  statements.push(db.prepare('INSERT OR IGNORE INTO products(id,data,created_at) VALUES(?,?,?)').bind(p.id,JSON.stringify(p),now));
  for(const size of p.sizes)statements.push(db.prepare('INSERT OR IGNORE INTO variants(product_id,size,color,stock) VALUES(?,?,?,?)').bind(p.id,size,p.colors[0].name,size===38?3:12));
 }
 for(const name of [...new Set(initialProducts.map(p=>p.category))])statements.push(db.prepare('INSERT OR IGNORE INTO categories(name) VALUES(?)').bind(name));
 statements.push(db.prepare('INSERT OR IGNORE INTO brands(name) VALUES(?)').bind('AERFORM'));
 statements.push(db.prepare('INSERT OR IGNORE INTO coupons(code,percent,min_total) VALUES(?,?,?)').bind('FIRST10',10,0));
 await db.batch(statements);
}
