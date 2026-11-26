import { getVersionLabel } from '$lib/utils/version-label';

describe('getVersionLabel', () => {
  it('shows the delivered Liss release beside the unchanged base version', () => {
    expect(getVersionLabel('v3.3.5', 'Liss r2')).toBe('v3.3.5 · Liss r2');
    expect(getVersionLabel('v3.3.5', 'Liss r12')).toBe('v3.3.5 · Liss r12');
  });

  it.each([undefined, '', '123456', 'Liss r0', 'Liss r2 extra', 'Liss r2\n'])(
    'keeps the base version when the build is not a Liss release: %s',
    (build) => {
      expect(getVersionLabel('v3.3.5', build)).toBe('v3.3.5');
    },
  );

  it('does not parse or rewrite the supplied server version', () => {
    expect(getVersionLabel('v3.3.5-rc.0', 'Liss r2')).toBe('v3.3.5-rc.0 · Liss r2');
  });
});
