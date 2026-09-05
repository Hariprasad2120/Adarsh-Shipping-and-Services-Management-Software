import { chromium } from "playwright-core";
const B="http://localhost:3000";
const b=await chromium.launch({headless:true});
const p=await(await b.newContext({viewport:{width:1440,height:960}})).newPage();
await p.goto(`${B}/login`,{waitUntil:"domcontentloaded"});
await p.waitForSelector('input[name="email"]',{timeout:90000});
await p.fill('input[name="email"]',"hr@adarshshipping.in");
await p.fill('input[name="password"]',"password@123");
await Promise.all([p.waitForURL(u=>!u.pathname.includes("/login"),{timeout:30000}).catch(()=>{}),p.click('button[type="submit"]')]);
await p.goto(`${B}/dashboard`,{waitUntil:"networkidle"});
await p.evaluate(()=>localStorage.setItem("theme","dark"));
await p.reload({waitUntil:"networkidle"});
await p.waitForTimeout(1500);
const d=await p.evaluate(()=>{
  const btn=document.querySelector(".ds-punch-actions button");
  if(!btn)return{err:"no btn"};
  const cs=getComputedStyle(btn);
  const g=n=>cs.getPropertyValue(n).trim();
  // walk ancestors, report where --ds-surface changes
  const chain=[];
  let el=btn;
  while(el && el!==document.documentElement){
    const s=getComputedStyle(el).getPropertyValue("--ds-surface").trim();
    chain.push({tag:el.tagName+"."+(el.className&&el.className.baseVal!==undefined?el.className.baseVal:String(el.className||"")).split(" ").slice(0,3).join("."), dsSurface:s});
    el=el.parentElement;
  }
  return {
    btnPa_bg: g("--_pa-bg"),
    btnDsSurface: g("--ds-surface"),
    btnDsSurfaceRaised: g("--ds-surface-raised"),
    btnBg: cs.backgroundColor,
    chain: chain.slice(0,10),
  };
});
console.log(JSON.stringify(d,null,2));
await b.close();
