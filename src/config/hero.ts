// Zoom hero photo: the one place to change when swapping the studio photo.
//
// To use a new photo:
//   1. Put it in src/assets/ and point the import below at it.
//   2. Set `monitor` to the monitor screen's box in the new photo, in the photo's own pixels:
//      x0 = left edge, y0 = top edge, x1 = right edge, y1 = bottom edge.
//
// What a replacement photo needs (see README, "Homepage hero"):
//   - landscape 16:9, at least 1920x1080 (2560x1440 is better); JPEG is fine
//   - the monitor shot straight on, screen about 16:10 and 15-25% of the photo's width
//   - the monitor near the horizontal center and about 40-60% of the way down
//   - a calm top third with no signage or text (the headline sits over it)
//
// TODO confirm: the current photo is the design mockup's hair-salon placeholder
// ("Good hair happier people" signage). Replace it with a spray tan studio photo before launch.
import photo from '../assets/hero-studio.jpg';

export const heroPhoto = {
  src: photo,
  monitor: { x0: 673, y0: 334, x1: 970, y1: 516 },
};
