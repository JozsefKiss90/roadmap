/** The static picture of the stack, as markup made by the build (see src/stack-picture.ts). */
declare module 'virtual:stack-picture' {
  const picture: string;
  export default picture;
}

/** The build identifier, set by the build (see src/build-stamp.ts). */
declare const __BUILD_ID__: string;

/** The stack layout, computed by the build (see vite.config.ts). */
declare module 'virtual:stack-layout' {
  const layout: import('./layout').StackLayout;
  export default layout;
}
