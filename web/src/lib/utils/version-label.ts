/** Use the existing delivered build identifier without changing the upstream SemVer. */
export const getVersionLabel = (version: string, build?: string) =>
  build && build.match(/^Liss r[1-9]\d*/)?.[0] === build ? `${version} · ${build}` : version;
