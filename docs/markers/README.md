# Alignment markers

Markers A and B align the track plan in the app. Marker A is the origin of the track coordinates, and the line from A to B sets the heading. The app recognises them with [ARCore Augmented Images](https://developers.google.com/ar/develop/augmented-images).

| File | Use |
|------|-----|
| `markers_A3.pdf` | Print this one. Page 1 is A and page 2 is B, each 270 mm wide. |
| `markers_A4.pdf` | For printers without A3. Each marker is 180 mm wide. |
| `marker_A.png`, `marker_B.png` | Reference images the app registers with ARCore. |
| `make_markers.py` | Regenerates all of the above (`python docs/markers/make_markers.py`). |

Prefer A3: ARCore only detects a marker once it fills at least 25% of the camera view, so a bigger print means you can stand further away.

## Printing

1. Print at **100% / actual size**. Turn off "fit to page" in the print dialog.
2. Measure the black frame and the 100 mm bar. The frame must measure 270 mm on A3 or 180 mm on A4. If it doesn't, the printer scaled the page.
3. Mount each sheet flat on rigid board, and laminate it or put it in a sleeve. Wrinkled or curved sheets track badly.
4. Lay each marker flat at its surveyed point, with the marker's centre on the point. B goes at the position given for it in the track plan.

## Width to register in the app

The app must register each image with the width that was actually printed. A wrong width gives the wrong scale for the whole track.

| Print | `addImage(..., widthInMeters)` |
|-------|--------------------------------|
| A3 | `0.270f` |
| A4 | `0.180f` |

If you print at another size, use the measured width of the black frame.

## Image quality score

Google's `arcoreimg` tool scores how well ARCore can detect an image, from 0 to 100, and Google recommends at least 75. Both markers score **100**. A plain checkerboard, as a control, scores 0.

To score a new or regenerated marker, get `arcoreimg` from the [ARCore Android SDK](https://github.com/google-ar/arcore-android-sdk/tree/main/tools/arcoreimg) and run:

```bash
arcoreimg eval-img --input_image_path=docs/markers/marker_A.png
```

A high score only means ARCore can find the image. It says nothing about how precise the position is, which still has to be measured in the field.

Regenerating the markers can change the letter's font on another machine. If you regenerate them, reprint them too, so the printed markers still match the PNGs.
