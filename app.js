const demoMovies=[
 {title:"فيلم تجريبي 1",type:"فيلم",image:"https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=700&q=80"},
 {title:"فيلم تجريبي 2",type:"فيلم",image:"https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=80"},
 {title:"فيلم تجريبي 3",type:"فيلم",image:"https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=700&q=80"}
];
const demoSeries=[
 {title:"ورود وذنوب",type:"مسلسل",image:"https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=700&q=80"},
 {title:"مسلسل تجريبي 2",type:"مسلسل",image:"https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=700&q=80"},
 {title:"مسلسل تجريبي 3",type:"مسلسل",image:"https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=700&q=80"}
];
let content=[...demoMovies,...demoSeries];
function card(x){return `<article class="card"><img class="poster" src="${x.image}" alt=""><div class="card-body"><h3>${x.title}</h3><div class="meta">${x.type} • SOKA</div><button onclick="watch('${x.title}')">▶ مشاهدة</button></div></article>`}
function render(){movieGrid.innerHTML=content.filter(x=>x.type==="فيلم").map(card).join("");seriesGrid.innerHTML=content.filter(x=>x.type==="مسلسل").map(card).join("")}
function searchContent(){let q=searchInput.value.trim();searchGrid.innerHTML=q?content.filter(x=>x.title.includes(q)).map(card).join(""):""}
function watch(t){location.hash="watch";watchTitle.textContent=t}
function addItem(){let title=document.getElementById("title").value.trim(),type=document.getElementById("type").value==="movie"?"فيلم":"مسلسل",image=document.getElementById("image").value.trim()||"https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=700&q=80";if(!title){alert("اكتب اسم المحتوى");return}content.unshift({title,type,image});render();alert("تمت الإضافة محليًا في هذه النسخة التجريبية");}
render();