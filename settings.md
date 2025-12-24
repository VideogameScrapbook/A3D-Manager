This document attempts to capture all of the settings used by games in their settings.json files. We should make sure we have proper types/interfaces/whatever other kind of organization makes sense for things like importing/exporting/updating values here.

# Types of controls:
These are the different kinds of controls present on the Analogue 3D OS. We want to simulate these controls in our system to make it feel pretty 1:1. Users will like the way it feels similar.

## OptionSelector
This is basically an alternative to a drop down menu. 
[ Left Arrow ] [Current Value] [ Right Arrow ]
When there are multiple options, the left and right arrows light up to let users traverse between them one at a time. If there are no more options to the left, the left arrow should be a bit dim. If there are no options more on the right, that arrow should be dim.

## Toggle
This should be a toggle that effectively has two states:
OFF (o  ) 
 ON (  o)

When off, an "OFF" label displays on the left side of the toggle. The rounded rectangle with the toggle in it should have a black background, with a white outline. The toggle is a white circle (filled). When on, The border and background both turn green, but the toggle circle turns white (and has a smaller green dot in the middle). The "OFF" turns to "ON"

The toggle is always right aligned, with the text labels being right aligned too.


# Settings
## Display
Display Mode:
BVM
PVM
CRT
Scanlines
Clean

Depending on the Display mode selected, users are presented with Display Mode specific settings. Users only see the settings for the current selected Display Mode. Users should be able to set a display mode, change the display mode specific settings (e.g. BVM Has `horizontalBeamConvergence` which can be set to `Consumer` or `Professional`), and then they can change the Display Mode again to another option like PVM and adjust specific settings for that. When they switch back to BVM, they should immediately see the settings that were last set on that Display Mode. In other words, changes to specific Display Mode settings persist immediate on change.

## BVM
### Horiz. Beam Convergence
horizontalBeamConvergence
Control: OptionSelector
Options:
`Off`
`Consumer`
`Professional` (default)

### Vert. Beam Convergence
verticalBeamConvergence
Control: OptionSelector
Options:
`Off`
`Consumer`
`Professional` (default)

### Edge Overshoot
enableEdgeOvershoot
Control: ToggleSwitch
Default: `false`

### Edge Hardness
enableEdgeHardness
Control: OptionSelector
Options:
`Soft` (default) maps to `false`
`Hard` maps to `true`

### Image Size
imageSize
Control: OptionSelector
Options:
`Fill` (default)
`Integer`
`Integer+`

### Image Fit
imageFit
Control: OptionSelector
Options:
`Original` (default)
`Stretch`
`Cinema Zoom`

## PVM
### Horiz. Beam Convergence
horizontalBeamConvergence
Control: OptionSelector
Options:
`Off`
`Consumer`
`Professional` (default)

### Vert. Beam Convergence
verticalBeamConvergence
Control: OptionSelector
Options:
`Off`
`Consumer`
`Professional` (default)

### Edge Overshoot (Disabled, always "ON")
enableEdgeOvershoot
Control: ToggleSwitch
Default: `true`

### Edge Hardness
enableEdgeHardness
Control: OptionSelector
Options:
`Soft` (default) maps to `false`
`Hard` maps to `true`

### Image Size
imageSize
Control: OptionSelector
Options:
`Fill` (default)
`Integer`
`Integer+`

### Image Fit
imageFit
Control: OptionSelector
Options:
`Original` (default)
`Stretch`
`Cinema Zoom`

## CRT
### Horiz. Beam Convergence
horizontalBeamConvergence
Control: OptionSelector
Options:
`Off`
`Consumer` (default)
`Professional`

### Vert. Beam Convergence
verticalBeamConvergence
Control: OptionSelector
Options:
`Off`
`Consumer` (default)
`Professional`

### Edge Overshoot (Disabled, always "ON")
enableEdgeOvershoot
Control: ToggleSwitch
Default: `true`

### Edge Hardness
enableEdgeHardness
Control: OptionSelector
Options:
`Soft` (default) maps to `false`
`Hard` maps to `true`

### Image Size
imageSize
Control: OptionSelector
Options:
`Fill` (default)
`Integer`
`Integer+`

### Image Fit
imageFit
Control: OptionSelector
Options:
`Original` (default)
`Stretch`
`Cinema Zoom`

## Scanlines
### Horiz. Beam Convergence
horizontalBeamConvergence
Control: OptionSelector
Options:
`Off` (default)
`Consumer`
`Professional`

### Vert. Beam Convergence
verticalBeamConvergence
Control: OptionSelector
Options:
`Off` (default)
`Consumer`
`Professional`

### Edge Overshoot (Disabled, always "OFF")
enableEdgeOvershoot
Control: ToggleSwitch
Default: `false`

### Edge Hardness
enableEdgeHardness
Control: OptionSelector
Options:
`Soft` (default) maps to `false`
`Hard` maps to `true`

### Image Size
imageSize
Control: OptionSelector
Options:
`Fill` (default)
`Integer`
`Integer+`

### Image Fit
imageFit
Control: OptionSelector
Options:
`Original` (default)
`Stretch`
`Cinema Zoom`

## Clean
### Interp. Algorithm
interpolationAlg
Control: OptionSelector
Options:
`BC Spline` (default)
`Bilinear`
`Blackman Harris`
`Lanczos2`

### Gamma Transfer
gammaTransferFunction
Control: OptionSelector
Options:
`Tube` (default)
`Modern`
`Professional`

### Sharpness
sharpness
Control: OptionSelector
Options:
`Very Soft` 
`Soft`
`Medium` (default)
`Sharp`
`Very Sharp`

### Image Size
imageSize
Control: OptionSelector
Options:
`Fill` (default)
`Integer`
`Integer+`

### Image Fit
imageFit
Control: OptionSelector
Options:
`Original` (default)
`Stretch`
`Cinema Zoom`

# Hardware Settings
## Virtual Expansion Pak
virtualExpansionPak
Control: ToggleSwitch
Default: `true`

## Region
region
Control: OptionSelector
Options:
`Auto` (default)
`NTSC`
`PAL`

## De-Blur
disableDeblur
Control: ToggleSwitch
Default: `false` (This one is strange, because when this is set to `false` we want the Toggle to say "ON" and be lit green. the label for this control is the opposite of the `disableDeblur`. Users prefer to think about turning Deblur on or off, whereas the settings.json file stores a double negative with `disableDeblur`)

## 32bit Color
enable32BitColor
Control: OptionSelector
Options:
`Off` maps to `false`
`Auto` (default) maps to `true`

## Disable Texture Filtering
disableTextureFiltering
Control: ToggleSwitch
Default: `false`

## Disable Antialiasing
disableAntialiasing
Control: ToggleSwitch
Default: `false`

## Force Original Hardware
forceOriginalHardware
Control: ToggleSwitch
Default: `false`
Note: When this is enabled, `overclock` control should be disabled (keep whatever setting it was last set to, just dim and prevent adjustmnet)

## Overclock
overclock
Control: OptionSelector
Options:
`Auto` (default)
`Enhanced`
`Enhanced+`
`Unleashed`