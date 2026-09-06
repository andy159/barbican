/* ================================================================
   TUNING — everything that defines how the player FEELS.
   Tweak, refresh, repeat. Units: px per frame at 60 fps.
   This is the single source of truth for physics — never
   hardcode movement numbers elsewhere.
   ================================================================ */
export const TUNING = {
  runAccel:      0.12,   // ground acceleration
  airAccel:      0.065,  // air acceleration
  friction:      0.16,   // ground deceleration when no input
  airDrag:       0.02,   // air deceleration when no input
  maxRun:        1.6,    // max horizontal speed

  gravity:       0.21,
  maxFall:       4.0,    // terminal velocity
  apexWindow:    0.55,   // |vy| below this = "at apex"
  apexGravMult:  0.6,    // gravity multiplier at apex (floatiness)

  jumpVelocity:  3.5,    // initial upward speed
  jumpCut:       0.45,   // vy multiplier when jump released early
  coyoteFrames:  6,      // grace frames after leaving a ledge
  bufferFrames:  6,      // frames a jump press is remembered
  cornerNudge:   2,      // px of ceiling corner correction

  wallSlideSpeed: 1.1,   // max fall speed while pressed against a wall
  wallJumpVX:     2.2,   // horizontal kick away from the wall
  wallJumpVY:     3.3,   // upward speed of a wall jump
  wallJumpLock:   10,    // frames of horizontal input ignored after a wall jump
  wallCoyoteFrames: 5,   // grace frames after leaving wall contact

  dashSpeed:     3.2,    // px/frame during a dash (15f × 3.2 = 48px)
  dashFrames:    15,     // dash duration
  dashFreeze:    3,      // frames of hit-stop on activation
  dashUpExitMult: 0.5,   // vy kept when an upward dash ends (softens the pop)

  bargeWindup:   6,      // coil-up frames before the barge launches
  bargeFrames:   14,     // barge travel duration
  bargeSpeed:    2.4,    // px/frame during the barge
  bargeShake:    8,      // screen-shake frames when a hoarding breaks

  wadeSpeedMult: 0.5,    // max run speed multiplier while in shallow water
  wadeJumpMult:  0.85,   // jump velocity multiplier when launching from water

  squashLand:    0.55,   // scaleY on hard landing (lower = squashier)
  squashJump:    1.28,   // scaleY on jump
  squashRecover: 0.14,   // lerp speed back to normal
};
