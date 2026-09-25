import {createContext,useContext} from 'react';
export const StoryContext=createContext(null);
export const useStory=()=>useContext(StoryContext);
export function Link({to,children,className='',...props}){const {navigate}=useStory();return <a href={to} className={className} {...props} onClick={e=>{if(!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&e.button===0){e.preventDefault();navigate(to)}}}>{children}</a>}
export const chapters=[['/vision','The vision','01'],['/architecture','Architecture','02'],['/landscape','Landscape','03'],['/interiors','Interiors','04'],['/residences','Residences','05'],['/journal','Journal','06']];
