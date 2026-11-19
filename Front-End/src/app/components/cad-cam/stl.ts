export type Point = [number, number, number];
export type Triangle = [Point, Point, Point];

export const maxTriangles = 250_000;
export const maxFileBytes = 24 * 1024 * 1024;

export function readStl(buffer: ArrayBuffer): Triangle[] {
  if (buffer.byteLength > maxFileBytes) throw new Error('El límite por archivo es 24 MB.');
  const view = new DataView(buffer);
  const count = buffer.byteLength >= 84 ? view.getUint32(80, true) : 0;
  const triangles: Triangle[] = [];

  if (buffer.byteLength >= 84 && 84 + count * 50 === buffer.byteLength) {
    if (count > maxTriangles) throw new Error('El límite es de 250 000 triángulos.');
    for (let face = 0; face < count; face++) {
      const start = 84 + face * 50 + 12;
      const point = (index: number): Point => [
        view.getFloat32(start + index * 12, true),
        view.getFloat32(start + index * 12 + 4, true),
        view.getFloat32(start + index * 12 + 8, true),
      ];
      triangles.push([point(0), point(1), point(2)]);
    }
  } else {
    const source = new TextDecoder().decode(buffer).trim();
    const lines = source.split(/\r?\n/);
    if (!/^solid(?:\s|$)/i.test(lines[0]) || !/^endsolid(?:\s|$)/i.test(lines.at(-1) ?? '')) {
      throw new Error('El archivo no tiene un formato STL válido.');
    }
    const facet = /facet\s+normal\s+\S+\s+\S+\s+\S+\s+outer\s+loop\s+vertex\s+(\S+)\s+(\S+)\s+(\S+)\s+vertex\s+(\S+)\s+(\S+)\s+(\S+)\s+vertex\s+(\S+)\s+(\S+)\s+(\S+)\s+endloop\s+endfacet/iy;
    const body = lines.slice(1, -1).join('\n').trim();
    while (facet.lastIndex < body.length) {
      const match = facet.exec(body);
      if (!match) throw new Error('El archivo STL contiene una cara incompleta.');
      const values = match.slice(1).map(Number);
      triangles.push([
        [values[0], values[1], values[2]],
        [values[3], values[4], values[5]],
        [values[6], values[7], values[8]],
      ]);
      if (triangles.length > maxTriangles) throw new Error('El límite es de 250 000 triángulos.');
      while (facet.lastIndex < body.length && /\s/.test(body[facet.lastIndex])) facet.lastIndex++;
    }
  }

  if (!triangles.length || triangles.some(face => face.some(point =>
    point.some(value => !Number.isFinite(value) || Math.abs(value) > 1_000_000)))) {
    throw new Error('El modelo está vacío o contiene coordenadas fuera de rango.');
  }
  return triangles;
}

export function bounds(faces: Triangle[]) {
  const min: Point = [Infinity, Infinity, Infinity];
  const max: Point = [-Infinity, -Infinity, -Infinity];
  for (const face of faces) {
    for (const point of face) {
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], point[axis]);
        max[axis] = Math.max(max[axis], point[axis]);
      }
    }
  }
  const size: Point = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return { min, size };
}

export function transformMesh(faces: Triangle[], scale: number, degrees: number): Triangle[] {
  const { min, size } = bounds(faces);
  const angle = degrees * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  function transform([x, y, z]: Point): Point {
    x -= min[0] + size[0] / 2;
    y -= min[1] + size[1] / 2;
    return [(x * cos - y * sin) * scale, (x * sin + y * cos) * scale, (z - min[2]) * scale];
  }
  return faces.map(([a, b, c]) => [transform(a), transform(b), transform(c)]);
}

export function sliceMesh(faces: Triangle[], z: number): [Point, Point][] {
  const segments: [Point, Point][] = [];
  for (const face of faces) {
    const intersections: Point[] = [];
    for (let i = 0; i < 3; i++) {
      const a = face[i];
      const b = face[(i + 1) % 3];
      if ((a[2] < z) === (b[2] < z)) continue;
      const t = (z - a[2]) / (b[2] - a[2]);
      intersections.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), z]);
    }
    const [a, b] = intersections;
    if (a && b && (a[0] !== b[0] || a[1] !== b[1])) segments.push([a, b]);
  }
  return segments;
}

export function writeStl(faces: Triangle[]): ArrayBuffer {
  const buffer = new ArrayBuffer(84 + faces.length * 50);
  const view = new DataView(buffer);
  view.setUint32(80, faces.length, true);
  faces.forEach(([a, b, c], index) => {
    const [ux, uy, uz] = b.map((value, axis) => value - a[axis]);
    const [vx, vy, vz] = c.map((value, axis) => value - a[axis]);
    const normal: Point = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const length = Math.hypot(...normal) || 1;
    let offset = 84 + index * 50;
    for (const point of [normal.map(value => value / length), a, b, c]) {
      for (const value of point) {
        view.setFloat32(offset, value, true);
        offset += 4;
      }
    }
  });
  return buffer;
}
