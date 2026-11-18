"use client";
import {useEffect,useRef,type ReactNode} from "react";
export function Reveal({children}:{children:ReactNode}){
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{const element=container.current;if(!element||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){element.animate([{opacity:.65,transform:"translateY(6px)"},{opacity:1,transform:"translateY(0)"}],{duration:200});observer.disconnect()}});
 observer.observe(element);return ()=>observer.disconnect();},[]);
 return <div ref={container}>{children}</div>;
}
