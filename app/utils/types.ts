export type NoNullables<Type> = {
  [Key in keyof Type]-?: NoNullables<NonNullable<Type[Key]>>;
};
