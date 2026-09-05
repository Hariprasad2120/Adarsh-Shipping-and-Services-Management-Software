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
await p.mouse.move(720,12);
const d=await p.evaluate(()=>{
  const o=[];
  document.querySelectorAll(".ds-punch-actions button").forEach(el=>{
    const cs=getComputedStyle(el);
    const svg=el.querySelector("svg");
    const scs=svg?getComputedStyle(svg):null;
    const label=[...el.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
    o.push({
      text:el.textContent.trim(),
      tone:el.getAttribute("data-tone"),
      variant:el.getAttribute("data-variant"),
      cls:el.className,
      bg:cs.backgroundColor, color:cs.color, opacity:cs.opacity, visibility:cs.visibility,
      borderColor:cs.borderColor,
      svgColor:scs?scs.color:null, svgStroke:scs?scs.stroke:null,
      pseudoHover: el.matches(":hover"),
    });
  });
  // also the wrapping span text color
  return o;
});
console.log(JSON.stringify(d,null,2));
await b.close();
