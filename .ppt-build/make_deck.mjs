import fs from 'node:fs/promises';
import path from 'node:path';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const W=1280,H=720;
const C={bg:'#F7F5EF',ink:'#173B35',green:'#1D6857',mint:'#DCE9DF',gold:'#C99A43',muted:'#5D706A',line:'#D6DED5',white:'#FFFFFF',pale:'#EEF1E9',red:'#B86B52'};
const out='E:/OtherProjects/Temp';
const build=path.join(out,'.ppt-build');
await fs.mkdir(build,{recursive:true});
await fs.mkdir(path.join(build,'node_modules'),{recursive:true});
try { await fs.symlink('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules',path.join(build,'node_modules'), 'junction'); } catch {}
const p=Presentation.create({slideSize:{width:W,height:H}});
const noLine={style:'solid',fill:'none',width:0};
function rect(s,x,y,w,h,fill,r=0,stroke='none'){
  return s.shapes.add({geometry:r?'roundRect':'rect',position:{left:x,top:y,width:w,height:h},fill,line:{style:'solid',fill:stroke,width:stroke==='none'?0:1},...(r?{borderRadius:'rounded-xl'}:{})});
}
function txt(s,text,x,y,w,h,size=24,color=C.ink,bold=false,opts={}){
 const a=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:noLine});
 a.text=text; a.text.style={fontFamily:'Microsoft YaHei',fontSize:size,color,bold,verticalAlignment:'middle',wrap:true,...opts}; return a;
}
function rule(s,x,y,w,color=C.line,th=2){rect(s,x,y,w,th,color);}
function base(title,section='东盟自然资源智能推理'){
 const s=p.slides.add(); s.background.fill=C.bg;
 rect(s,0,0,14,H,C.green); txt(s,section.toUpperCase(),56,28,500,24,13,C.green,true,{charSpacing:1});
 txt(s,title,56,65,1150,58,34,C.ink,true); rule(s,56,139,1168);
 txt(s,'广西大学｜第八届 AIC 算法大赛广西赛区省级选拔赛',56,678,900,20,12,C.muted,false);
 return s;
}
function label(s,t,x,y,w=180){txt(s,t,x,y,w,28,15,C.green,true);}
function body(s,t,x,y,w,h,size=21,color=C.ink){txt(s,t,x,y,w,h,size,color,false,{verticalAlignment:'top',lineSpacing:1.12});}
function bullet(s,t,x,y,w,size=19,color=C.ink){rect(s,x,y+10,7,7,C.gold,1);body(s,t,x+20,y,w-20,52,size,color);}
function node(s,t,x,y,w,h,fill=C.mint,color=C.ink,size=18){rect(s,x,y,w,h,fill,1);txt(s,t,x+8,y+4,w-16,h-8,size,color,true,{alignment:'center'});}
function arrow(s,x1,y1,x2,y2,color=C.gold){
  const dx=x2-x1,dy=y2-y1; const len=Math.sqrt(dx*dx+dy*dy); const angle=Math.atan2(dy,dx)*180/Math.PI;
  const sh=s.shapes.add({geometry:'line',position:{left:x1,top:y1,width:len,height:0},fill:'none',line:{style:'solid',fill:color,width:3,beginArrowType:'none',endArrowType:'triangle'}}); sh.rotation=angle;
}
function numbered(s,n,t,x,y){txt(s,String(n).padStart(2,'0'),x,y,54,42,24,C.gold,true);txt(s,t,x+62,y,360,42,22,C.ink,true);}

// 1 Cover
{
 const s=p.slides.add(); s.background.fill=C.ink;
 // Quiet layered map-like bands made from editable strokes, used as abstract geography.
 for(let i=0;i<7;i++){
  const sh=s.shapes.add({geometry:'ellipse',position:{left:760+i*34,top:40+i*28,width:520-i*34,height:600-i*44},fill:'none',line:{style:'solid',fill:i%2? '#397A67':'#C99A43',width:1.2}});
 }
 rect(s,78,86,6,480,C.gold);
 txt(s,'东盟语料下 RAG 增强的\n自然资源分布推理系统',112,126,740,170,46,C.white,true,{verticalAlignment:'top',lineSpacing:1.04});
 txt(s,'赛题 4｜“AI + 场景创新”',114,330,620,42,22,'#D5E5DC',true);
 txt(s,'第八届 AIC 算法大赛广西赛区省级选拔赛',114,380,700,34,18,'#D5E5DC');
 rule(s,114,444,360,'#547D70',2);
 txt(s,'汇报人：邹科',114,475,300,30,19,C.white,true);
 txt(s,'广西大学计算机与电子信息学院（人工智能学院）',114,514,650,32,17,'#D5E5DC');
 txt(s,'跨语种语料 · 资源知识 · 空间推理 · 供需连接',114,618,740,26,15,'#C99A43',true);
}
// 2 Contents
{
 const s=base('汇报目录');
 const items=['项目背景与价值','赛题定位与核心问题','技术路线与关键方法','系统实现与核心功能','项目价值与展望'];
 items.forEach((t,i)=>{const y=186+i*88; if(i===0)rect(s,78,y-4,1080,68,C.ink,1); txt(s,`0${i+1}`,100,y+8,70,38,24,i===0?C.gold:C.muted,true);txt(s,t,190,y+7,780,42,25,i===0?C.white:C.ink,i===0); if(i!==0)rule(s,190,y+62,900);});
}
// 3 Strategic context
{
 const s=base('项目背景与价值｜战略牵引、现实困境与应用机会');
 const cols=[{x:74,n:'01',h:'战略牵引',b:'国家层面：人工智能全球合作\n广西路径：北上广研发 + 广西集成 + 东盟应用'},{x:470,n:'02',h:'现实困境',b:'信息分散｜语种多元｜格式异构\n获取难、可信度低、整合成本高'},{x:866,n:'03',h:'项目价值',b:'建设东盟自然资源库\n资源分布可视化\n资源查询与供需智能对接'}];
 cols.forEach((a,i)=>{txt(s,a.n,a.x,205,70,52,34,C.gold,true);txt(s,a.h,a.x,269,320,40,25,C.ink,true);rule(s,a.x,322,320,C.green,3);body(s,a.b,a.x,350,320,150,19);if(i<2)arrow(s,a.x+338,300,a.x+380,300);});
 txt(s,'从多语种信息发现，走向资源与开发需求的连接',74,555,1070,48,24,C.green,true,{alignment:'center'});
}
// 4 challenge positioning
{
 const s=base('赛题定位｜集成创新与场景创新并重');
 txt(s,'赛题 4',86,193,150,34,18,C.gold,true);body(s,'“AI + 场景创新”\n捕捉产业痛点，探索人工智能新应用、新服务、新业态与新模式',86,235,430,170,24);
 rect(s,620,194,2,355,C.line);
 label(s,'场景创新',690,205);body(s,'企业找不到资源\n资源找不到开发者\n供需两端信息不对称',690,248,440,145,22);
 label(s,'集成创新',690,422);body(s,'面向东盟自然资源场景\n把语料、检索、大模型、知识图谱、空间推理与匹配连成闭环',690,463,460,120,20);
}
// 5 Three outputs
{
 const s=base('核心问题｜从多语种图文语料到可决策知识');
 node(s,'多语种、多模态\n东盟语料',66,276,180,96,C.ink,C.white,19);
 const outs=[['结构化知识','资源种类 · 产地\n产量 · 用途'],['空间化表达','行政区划单元\n资源分布图'],['供需对接建议','需求匹配\n可行性评估']];
 outs.forEach((a,i)=>{const x=330+i*290;node(s,a[0],x,216,226,56,C.mint,C.ink,19);body(s,a[1],x+4,286,216,76,18,C.muted);if(i<2)arrow(s,x+236,243,x+274,243);});
 arrow(s,250,324,322,244);
 txt(s,'核心问题',330,436,160,32,19,C.gold,true);body(s,'如何自动抽取资源实体与属性，构建结构化资源库，推理空间分布，并支持供需智能对接？',330,478,830,82,22);
}
// 6 challenges
{
 const s=base('关键挑战｜三项技术难点与一个场景难点');
 const a=[['语义对齐','多语种、多模态\n表达差异大'],['信息可信','错误、重复与冲突\n需要溯源消解'],['空间推理','数据稀疏时\n估算分布与置信度'],['供需连接','统一建模资源与需求\n实现双向推荐']];
 a.forEach((v,i)=>{const x=72+i*292;txt(s,`0${i+1}`,x,219,62,42,28,C.gold,true);txt(s,v[0],x,278,230,42,24,C.ink,true);rule(s,x,333,225,C.green,3);body(s,v[1],x,360,235,100,19);if(i===3)txt(s,'场景挑战',x,490,200,28,15,C.red,true);else txt(s,'技术挑战',x,490,200,28,15,C.muted,true);});
}
// 7 Roadmap
{
 const s=base('总体技术路线｜六段式闭环');
 const arr=[['语料','汇聚'],['抽取','检索生成'],['知识','图谱'],['推理','空间估算'],['对接','供需匹配'],['可视化','地图交互']];
 arr.forEach((v,i)=>{const x=48+i*202;node(s,`${v[0]}\n${v[1]}`,x,262,160,96,i===5?C.ink:C.mint,i===5?C.white:C.ink,19);if(i<5)arrow(s,x+165,310,x+195,310);});
 body(s,'输入：多语种、多模态东盟语料',80,432,480,36,19,C.muted);
 arrow(s,580,448,690,448,C.gold);
 body(s,'输出：结构化、空间化、可决策的自然资源知识',714,432,490,62,19,C.muted);
 txt(s,'地图反馈与用户查询回流，形成持续更新的业务闭环',100,550,1080,40,22,C.green,true,{alignment:'center'});
}
// 8 data foundation and stack
{
 const s=base('数据基础与技术选型');
 txt(s,'语料平台',78,190,300,38,24,C.green,true);txt(s,'20 TB',78,246,240,68,46,C.ink,true);txt(s,'平台存储能力',80,318,240,28,16,C.muted);rule(s,80,373,455);
 txt(s,'约 2.5 TB',80,401,260,48,32,C.ink,true);body(s,'已收集东盟多模态语料\n文本 · 音频 · 图像 · 视频\n覆盖东盟十国多种语言',80,459,440,112,18);
 rect(s,636,182,2,410,C.line);
 txt(s,'端到端技术链',700,190,430,38,24,C.green,true);
 const stack=['RAG 增强抽取','多模态大模型','Neo4j 知识图谱','空间分布推理','供需语义匹配'];
 stack.forEach((t,i)=>{const y=246+i*62;txt(s,String(i+1).padStart(2,'0'),700,y,50,32,18,C.gold,true);txt(s,t,756,y,400,34,21,C.ink,i===0);if(i<4)rule(s,756,y+45,390);});
}
// 9 RAG process
{
 const s=base('RAG 增强的多模态信息抽取');
 const steps=[['检索','多语种文本编码\n图像视觉编码\n图文语义对齐'],['生成','召回证据\n构建提示\n多模态模型抽取'],['适配','低资源语种术语\n别名映射\n证据筛选']];
 steps.forEach((a,i)=>{const x=78+i*392;txt(s,`0${i+1}`,x,205,62,44,30,C.gold,true);txt(s,a[0],x,262,310,38,25,C.ink,true);rule(s,x,317,300,C.green,3);body(s,a[1],x,344,320,132,20);if(i<2)arrow(s,x+330,282,x+370,282);});
 rect(s,78,526,1080,74,C.mint,1);txt(s,'输出：资源实体与属性 + 证据来源 + 置信度标注',102,543,1030,40,22,C.green,true,{alignment:'center'});
}
// 10 confidence
{
 const s=base('错误消解与置信度评估');
 const steps=['多源交叉验证','冲突分级消解','置信度评估','分级处理'];
 steps.forEach((t,i)=>{const x=72+i*294;node(s,t,x,205,228,60,i===3?C.ink:C.mint,i===3?C.white:C.ink,19);if(i<3)arrow(s,x+232,235,x+276,235);});
 const factors=[['证据强度','来源数量、权威性、一致性'],['抽取质量','模型输出、证据对齐、格式规范'],['领域一致性','自然资源常识与空间分布规律']];
 factors.forEach((v,i)=>{const x=86+i*372;txt(s,v[0],x,332,310,32,21,C.green,true);body(s,v[1],x,373,310,72,17);});
 [['高','直接入图谱',C.green],['中','待人工验证',C.gold],['低','过滤',C.red]].forEach((v,i)=>{const x=174+i*324;rect(s,x,495,256,68,v[2],1);txt(s,`${v[0]}置信度｜${v[1]}`,x+10,510,236,36,18,C.white,true,{alignment:'center'});});
}
// 11 graph
{
 const s=base('多模态知识图谱与供需统一建模');
 const nodes=[['资源',145,226],['产地',430,210],['产量',430,340],['用途',704,220],['生产单位',704,354],['企业需求',978,286]];
 nodes.forEach(([t,x,y],i)=>node(s,t,x,y,164,54,i===5?C.ink:C.mint,i===5?C.white:C.ink,18));
 arrow(s,310,252,423,236);txt(s,'产于',334,219,74,22,14,C.muted,true);
 arrow(s,310,260,423,364);txt(s,'分布 / 产出',336,302,90,23,13,C.muted,true);
 arrow(s,592,238,697,244);txt(s,'用于',618,211,60,22,14,C.muted,true);
 arrow(s,592,370,697,380);txt(s,'由…生产',616,342,86,22,14,C.muted,true);
 arrow(s,870,380,972,314);txt(s,'匹配 / 潜在合作',864,334,130,24,13,C.muted,true);
 txt(s,'本体设计',140,483,190,30,18,C.green,true);txt(s,'多模态融合',424,483,200,30,18,C.green,true);txt(s,'属性推理补全',700,483,220,30,18,C.green,true);txt(s,'双向供需建模',970,483,230,30,18,C.green,true);
 body(s,'文本三元组、图像实体与图文关联边共同支撑资源侧和需求侧知识连接。',143,535,970,50,17,C.muted);
}
// 12 spatial estimation
{
 const s=base('自然资源分布推理与分级表达');
 txt(s,'空间映射流程',78,190,300,36,23,C.green,true);
 const flow=['产地地理编码','县 / 省级映射','产量加权汇总','缺失数据估算'];
 flow.forEach((t,i)=>{const y=244+i*68;txt(s,`0${i+1}`,86,y,54,34,21,C.gold,true);txt(s,t,148,y,300,34,20,C.ink,true);if(i<3)rule(s,148,y+44,320);});
 txt(s,'估算线索',80,534,180,28,17,C.muted,true);txt(s,'种植面积 · 卫星植被指数 · 企业收购点 · 物流数据',80,568,520,42,16,C.muted);
 txt(s,'地图表达示意',670,190,320,34,22,C.green,true);
 // non-geographic editable grid conveys legend, not fabricated map data
 const colors=['#E8EFE8','#B9D2BE','#7EAE8A','#3F8066'];
 for(let r=0;r<4;r++)for(let c=0;c<5;c++){const k=(r+c)%4;rect(s,686+c*73,244+r*57,58,44,colors[k],1,'#FFFFFF');}
 rect(s,686,493,18,18,C.green,1);txt(s,'定量：颜色深浅表示产量高低',716,489,400,26,16,C.ink);
 rect(s,686,528,18,18,'#B9D2BE',1);txt(s,'定性：蒙版表示资源存在',716,524,400,26,16,C.ink);
 rect(s,686,563,18,18,'#D6D6D0',1);txt(s,'缺失：灰色标注，保留不确定性',716,559,440,26,16,C.ink);
 txt(s,'示意图例，不代表具体国家或县域的实测分布',686,608,480,20,12,C.muted);
}
// 13 matching
{
 const s=base('供需智能对接机制');
 const steps=[['需求解析','企业需求 → 结构化约束'],['双向匹配','图查询 + 向量检索'],['可行性评估','集中度 · 稳定性\n可达性 · 配套条件'],['合作方推荐','企业关系与历史关联']];
 steps.forEach((a,i)=>{const x=56+i*302;txt(s,`0${i+1}`,x,228,56,36,26,C.gold,true);txt(s,a[0],x,280,245,34,21,C.ink,true);rule(s,x,326,245,C.green,3);body(s,a[1],x,350,248,90,17);if(i<3)arrow(s,x+252,297,x+284,297);});
 rule(s,112,503,1048,C.line,2);txt(s,'资源端',120,530,200,30,18,C.green,true);txt(s,'资源、产地、产量、品质',120,567,370,28,17,C.muted);txt(s,'需求端',720,530,200,30,18,C.green,true);txt(s,'企业、技术要求、采购规模',720,567,400,28,17,C.muted);
 txt(s,'从“看见资源”走向“连接价值”',365,618,600,28,19,C.ink,true,{alignment:'center'});
}
// 14 system
{
 const s=base('系统实现｜地图交互与四层架构');
 txt(s,'地图交互',76,184,250,36,23,C.green,true);
 body(s,'县级热力图与资源蒙版\n资源分布与需求热点同图呈现\n点击空间单元查看来源与置信度\n按资源、产地、国家、产量筛选',76,235,400,190,19);
 txt(s,'查询 → 推理 → 展示 → 反馈',76,457,430,40,21,C.ink,true);
 rect(s,540,184,2,414,C.line);
 txt(s,'系统架构',600,184,270,36,23,C.green,true);
 const layers=[['前端','地图、检索与交互'],['后端','服务编排与业务逻辑'],['数据','HDFS · MySQL · Neo4j · ChromaDB'],['模型','RAG、多模态抽取、空间推理']];
 layers.forEach((a,i)=>{const y=238+i*78;rect(s,600,y,510,60,i%2?C.pale:C.mint,1);txt(s,a[0],620,y+10,115,34,18,C.green,true);txt(s,a[1],748,y+10,340,36,17,C.ink);});
}
// 15 value
{
 const s=base('项目价值｜四项核心能力');
 const vals=[['资源库','多语种、多模态语料\n抽取、对齐、消解'],['分布可视化','县级粒度热力图\n呈现资源分布'],['资源查询','按种类、产地、国家\n与产量交互检索'],['供需对接','推荐资源、开发者\n与潜在投资方']];
 vals.forEach((a,i)=>{const x=78+(i%2)*568,y=195+Math.floor(i/2)*194;txt(s,`0${i+1}`,x,y,54,42,28,C.gold,true);txt(s,a[0],x+68,y,400,38,23,C.ink,true);rule(s,x+68,y+52,420,C.green,3);body(s,a[1],x+68,y+70,430,68,18);});
 txt(s,'场景需求牵引技术集成，技术集成支撑场景落地',150,603,980,38,21,C.green,true,{alignment:'center'});
}
// 16 close
{
 const s=base('总结与展望');
 const cols=[{x:72,h:'总结',b:'围绕东盟自然资源发现与供需对接，形成“语料—抽取—知识—推理—对接—可视化”端到端链路。\n\n支持分布可视化、资源查询与企业资源智能对接。'},{x:470,h:'展望',b:'扩展语料覆盖与语种类型，提升低资源语种抽取能力。\n\n改进稀疏数据下的分布估算与空间推理。\n\n完善匹配可解释性与评估机制。'},{x:868,h:'致谢',b:'感谢广西大学东盟语料库管理与标注平台的支持。\n\n敬请各位老师批评指正。'}];
 cols.forEach(a=>{txt(s,a.h,a.x,202,330,38,24,C.green,true);rule(s,a.x,256,320,C.gold,3);body(s,a.b,a.x,282,320,248,18);});
 txt(s,'谢谢',520,581,240,62,36,C.ink,true,{alignment:'center'});
}

const draft=path.join(build,'candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(draft);
// Render all slides for visual review.
for(let i=0;i<p.slides.items.length;i++){
 const blob=await p.export({slide:p.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(build,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()));
}
const montage=await p.export({format:'webp',montage:true});
await fs.writeFile(path.join(build,'montage.webp'),new Uint8Array(await montage.arrayBuffer()));
console.log(`Created ${p.slides.items.length} slides at ${draft}`);
