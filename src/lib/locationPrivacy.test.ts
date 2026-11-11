import { expect, test, setSystemTime, afterEach } from 'bun:test';
import { mobileOnline } from './locationPrivacy';
afterEach(() => setSystemTime());
test('manual offline remains offline inside scheduled hours', () => {
 setSystemTime(new Date('2026-11-11T16:00:00Z'));
 expect(mobileOnline({ is_visible: false, operating_hours: { open: '09:00', close: '21:00', timezone: 'UTC' } })).toBe(false);
});
test('off duty mobile service cannot upload or appear online', () => {
 setSystemTime(new Date('2026-11-11T21:00:00Z'));
 expect(mobileOnline({ is_visible: true, operating_hours: { open: '09:00', close: '21:00', timezone: 'UTC' } })).toBe(false);
});
test('disabled service permission overrides an online post', () => {
 expect(mobileOnline({ is_visible: true, operating_hours: null }, false)).toBe(false);
});
test('online service without schedule is eligible', () => {
 expect(mobileOnline({ is_visible: true, operating_hours: null })).toBe(true);
});
