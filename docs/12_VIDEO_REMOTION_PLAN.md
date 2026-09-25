# 12 / Video and Remotion plan
Video begins after the first real-time prototype establishes the camera language. No generated video service is a dependency.

Planned project: `video/remotion/` with compositions, transitions, typography, overlays, audio and exports.
Before implementation, install/read the official [Remotion agent skills](https://www.remotion.dev/docs/ai/skills). No Remotion development or installation is claimed in this planning package.

First composition: ENTER bridge, 6–8 seconds. Input: original Blender image sequence or footage with a matching window/entrance. Shot 1: camera arrives at glazing; shot 2: reflection fills frame; shot 3: dissolve to interior light. Match camera axis, exposure and colour before adding transitions.
Reusable pieces: AfrahTitle, ArchitecturalCaption, MaskReveal, ChapterMarker, TimeCode and SoundCue. Keep decorative overlays disabled by default.
Master: 3840×2160 if source supports it, 25fps; mobile separately framed at 1080×1920. Web: short 1920×1080 H.264 MP4, optional WebM; poster specified. ProRes/EXR masters are archived, never shipped.
Acceptance: no layout shift, no autoplay audio, clean first frame, functional static alternative, measured byte/seek costs.
