import React from 'react';
import {AbsoluteFill,Composition,registerRoot,interpolate,useCurrentFrame} from 'remotion';
import {TransitionSeries,linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {Interior} from './scenes/Interior';
import {Still} from './scenes/Still';
function Film(){const frame=useCurrentFrame();return <AbsoluteFill style={{background:'#051936'}}>
 <TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={240}><Interior/></TransitionSeries.Sequence>
  <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames:30})}/>
  <TransitionSeries.Sequence durationInFrames={180}><Still src="media/living.webp"/></TransitionSeries.Sequence>
  <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames:30})}/>
  <TransitionSeries.Sequence durationInFrames={180}><Still src="era/finale.webp"/></TransitionSeries.Sequence>
 </TransitionSeries>
 <AbsoluteFill style={{background:'#051936',opacity:interpolate(frame,[0,28,470,539],[1,0,0,1],{extrapolateRight:'clamp'})}}/>
 <AbsoluteFill style={{justifyContent:'center',alignItems:'center',color:'#f8f0e8',fontFamily:'Arial,sans-serif',fontSize:74,letterSpacing:22,paddingLeft:22,opacity:interpolate(frame,[442,490],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}>AFRAH</AbsoluteFill>
 </AbsoluteFill>}
function Root(){return <Composition id="AfrahLife" component={Film} durationInFrames={540} fps={30} width={1280} height={720}/>}
registerRoot(Root);
