type X = [undefined] extends [number] ? true : false;
type Z = undefined extends number ? true : false;
const z: Z = false;

const a: number = null;
