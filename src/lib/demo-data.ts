export type District={id:string;name:string;applications:number;approved:number;started:number;progress:number;completed:number;pending:number;funds:number};
export const districts:District[]=[
{id:"hyd",name:"Hyderabad",applications:8425,approved:6270,started:5270,progress:2860,completed:2410,pending:3155,funds:142.8},
{id:"rang",name:"Rangareddy",applications:12840,approved:9460,started:8130,progress:4210,completed:3920,pending:3380,funds:215.4},
{id:"med",name:"Medchal–Malkajgiri",applications:6910,approved:5210,started:4380,progress:2490,completed:1890,pending:1700,funds:102.6},
{id:"war",name:"Warangal",applications:7930,approved:6250,started:5520,progress:2790,completed:2730,pending:1680,funds:128.2},
{id:"niz",name:"Nizamabad",applications:6570,approved:4920,started:4140,progress:2310,completed:1830,pending:1650,funds:96.7},
{id:"kar",name:"Karimnagar",applications:7140,approved:5580,started:4910,progress:2460,completed:2450,pending:1560,funds:118.4},
{id:"kha",name:"Khammam",applications:6880,approved:5290,started:4730,progress:2480,completed:2250,pending:1590,funds:111.9}];
export const stateTotals:District={id:"all",name:"Telangana",applications:127540,approved:93420,started:78460,progress:42580,completed:35880,pending:34120,funds:1842.6};
export const activities=[["Construction stage updated","Foundation completed","BEN-2026-001482","2 min ago"],["Expense approved","Material purchase","EXP-2026-000892","18 min ago"],["Beneficiary verified","Lakshmi Narayana","BEN-2026-004218","42 min ago"],["Material issued","120 cement bags","MIS-2026-000721","1 hr ago"],["Payment released","Roof installment","PAY-2026-003104","2 hrs ago"]];
