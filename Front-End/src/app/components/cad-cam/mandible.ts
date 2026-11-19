import type { Point, Triangle } from './stl';

export function mandibleMesh(): Triangle[] {
  const faces: Triangle[] = [];
  const sides = 24;

  function surface(rows: number, vertex: (u: number, v: number) => Point): void {
    const rings = Array.from({ length: rows + 1 }, (_, row) =>
      Array.from({ length: sides }, (_, side) => vertex(row / rows, side * 2 * Math.PI / sides)));
    for (let row = 0; row < rows; row++) {
      for (let side = 0; side < sides; side++) {
        const next = (side + 1) % sides;
        const a = rings[row][side];
        const b = rings[row][next];
        const c = rings[row + 1][next];
        const d = rings[row + 1][side];
        faces.push([a, b, c], [a, c, d]);
      }
    }
  }

  function arch(angle: number): [number, number] {
    return [34 * Math.sin(angle), -38 * Math.cos(angle)];
  }

  surface(96, (u, v) => {
    const angle = (u - 0.5) * 3.74;
    const [x, y] = arch(angle);
    const rear = Math.max(0, (Math.abs(angle) - 1.28) / 0.59);
    const tip = Math.min(1, Math.sqrt(Math.min(u, 1 - u) * 34));
    const radial = 5.5 * Math.cos(v) * tip;
    return [
      x + radial * Math.sin(angle),
      y - radial * Math.cos(angle),
      7 + 23 * rear ** 2 + (6.5 + 5 * rear) * Math.sin(v) * tip,
    ];
  });

  for (const side of [-1, 1]) {
    const positions = [0.09, 0.27, 0.46, 0.66, 0.87, 1.11, 1.38, 1.64];
    positions.forEach((position, index) => {
      const angle = position * side;
      const [x, y] = arch(angle);
      const molar = index >= 5;
      const wisdom = index === 7;
      const width = molar ? (wisdom ? 4.7 : 4.4) : 2.6 + index * 0.22;
      const depth = molar ? 4.6 : 3;
      const z = 15.5 + (wisdom ? 5 : 0);
      surface(12, (u, v) => {
        const latitude = Math.PI * u;
        const ring = Math.sin(latitude) ** 0.64;
        const tangent = width * Math.cos(v) * ring;
        const radial = depth * Math.sin(v) * ring;
        const cusp = molar ? 0.9 * Math.cos(4 * v) * ring * Math.max(0, Math.cos(latitude)) : 0;
        return [
          x + tangent * Math.cos(angle) + radial * Math.sin(angle),
          y + tangent * Math.sin(angle) - radial * Math.cos(angle),
          z + 4.5 * Math.cos(latitude) + cusp + (wisdom ? tangent * side * 0.25 : 0),
        ];
      });
    });
  }

  return faces;
}
