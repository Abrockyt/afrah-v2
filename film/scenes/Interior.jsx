import React from 'react';
import {AbsoluteFill,staticFile} from 'remotion';
import {Video} from '@remotion/media';
export function Interior(){return <AbsoluteFill><Video src={staticFile('media/interior-source.mp4')} trimBefore={60} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/></AbsoluteFill>}
