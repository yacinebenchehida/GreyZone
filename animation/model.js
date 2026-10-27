/* Standalone educational diploid Wright–Fisher model. No dependencies. */
(function(root){
'use strict';
function rng(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
function normal(r){let u=0;while(!u)u=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*r());}
function gamma(a,r){if(a<1)return gamma(a+1,r)*Math.pow(Math.max(r(),1e-16),1/a);const d=a-1/3,c=1/Math.sqrt(9*d);for(;;){const x=normal(r);let v=1+c*x;if(v<=0)continue;v=v*v*v;const u=r();if(u<1-.0331*x*x*x*x||Math.log(u)<.5*x*x+d*(1-v+Math.log(v)))return d*v;}}
// Exact binomial: inverse CDF for small means, recursive beta splitting otherwise.
function binomial(n,p,r=Math.random){if(n<=0||p<=0)return 0;if(p>=1)return n;if(p>.5)return n-binomial(n,1-p,r);if(n*p<25){let f=Math.exp(n*Math.log1p(-p)),u=r(),k=0;while(u>f&&k<n){u-=f;k++;f*=((n-k+1)/k)*(p/(1-p));}return k;}const k=Math.floor(n/2)+1,a=gamma(k,r),b=gamma(n-k+1,r),x=a/(a+b);return x>=p?binomial(k-1,p/x,r):k+binomial(n-k,(p-x)/(1-x),r);}
function gcd(a,b){while(b){const c=a%b;a=b;b=c;}return a;}
function sizes(s){const n1=Math.round(s.total*s.ratio/100);return [n1,s.total-n1];}
function initial(s){const [n1,n2]=sizes(s),d=gcd(2*n1,2*n2);const p=Array.from({length:s.loci},(_,i)=>Math.max(1,Math.min(d-1,Math.round(d*(.2+.6*((i*0.61803398875+.17)%1)))))/d);return {a:p.slice(),b:p.slice(),generation:0};}
function advance(pop,s,r=Math.random){const [n1,n2]=sizes(s),m1=s.migrants/n1,m2=s.migrants/n2,a=[],b=[];for(let l=0;l<s.loci;l++){const x=pop.a[l],y=pop.b[l];a.push(binomial(2*n1,(1-m1)*x+m1*y,r)/(2*n1));b.push(binomial(2*n2,(1-m2)*y+m2*x,r)/(2*n2));}return {a,b,generation:pop.generation+1};}
function fst(a,b){let hw=0,hb=0;for(let i=0;i<a.length;i++){hw+=a[i]*(1-a[i])+b[i]*(1-b[i]);hb+=a[i]+b[i]-2*a[i]*b[i];}return hb>0?Math.max(0,1-hw/hb):0;}
function logGamma(z){const c=[676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);z--;let x=.99999999999980993;for(let i=0;i<c.length;i++)x+=c[i]/(z+i+1);const t=z+7.5;return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);}
function gammaQ(a,x){if(x<=0)return 1;const factor=Math.exp(-x+a*Math.log(x)-logGamma(a));if(x<a+1){let sum=1/a,del=sum,ap=a;for(let i=0;i<300;i++){del*=x/(++ap);sum+=del;if(Math.abs(del)<Math.abs(sum)*1e-14)break;}return Math.max(0,Math.min(1,1-sum*factor));}let b=x+1-a,c=1e300,d=1/b,h=d;for(let i=1;i<300;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<1e-14)break;}return Math.max(0,Math.min(1,factor*h));}
function sample(pop,s,r=Math.random){const [n1,n2]=sizes(s),n=Math.min(s.sample,n1,n2),g=2*n;let chi=0,df=0,hw=0,hb=0;const a=[],b=[];for(let i=0;i<s.loci;i++){const x=binomial(g,pop.a[i],r)/g,y=binomial(g,pop.b[i],r)/g,p=(x+y)/2;a.push(x);b.push(y);if(p>0&&p<1){chi+=(x-y)*(x-y)/(p*(1-p)*2/g);df++;}hw+=(x*(1-x)+y*(1-y))*g/(g-1);hb+=x+y-2*x*y;}return {p:df?gammaQ(df/2,chi/2):1,fst:hb?1-hw/hb:0,a,b,n};}
const api={rng,binomial,sizes,initial,advance,fst,sample,gammaQ};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GreyModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
