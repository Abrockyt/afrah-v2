import React from 'react';
import {AbsoluteFill,Img,interpolate,staticFile,useCurrentFrame} from 'remotion';
export function Still({src}){const frame=useCurrentFrame();return <AbsoluteFill style={{overflow:'hidden'}}><Img src={staticFile(src)} style={{width:'100%',height:'100%',objectFit:'cover',scale:interpolate(frame,[0,180],[1,1.07],{extrapolateRight:'clamp'})}}/></AbsoluteFill>}
