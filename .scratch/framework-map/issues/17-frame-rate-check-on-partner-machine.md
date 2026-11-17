# 17: Frame-rate check on a partner's machine

**What to build:** A measured answer to whether the map is usable on the laptops the Designer and Analyst actually have. Headless frame rates are not representative, so a person does this on a real mid-tier machine with integrated graphics.

The budgets, at 1366×768: at least 30 frames per second while orbiting, first picture within 3 seconds of opening the file, and a built file under 5 MB.

**Blocked by:** 14

**Status:** ready-for-human

- [ ] The built file has been opened from `file://` on a partner's laptop, in current Chrome or Edge
- [ ] The machine's model, graphics and browser version are written under Comments
- [ ] Frame rate while orbiting is measured at the stack, tier and cluster distances, and during a need trace, and the figures are written under Comments
- [ ] Time from opening the file to the first picture is measured and written under Comments
- [ ] The built file's size is written under Comments
- [ ] If orbiting falls below 30 frames per second, depth blur is switched off and the measurement repeated
- [ ] If any budget is still missed, a follow-up ticket is opened that names the measurement and the distance at which it failed

## Comments
