/** The stack layout, computed by the build (see vite.config.ts). */
declare module 'virtual:stack-layout' {
  const layout: import('./layout').StackLayout;
  export default layout;
}
