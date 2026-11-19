import { Component, computed, effect, ElementRef, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { bounds, maxFileBytes, Point, readStl, sliceMesh, transformMesh, writeStl } from './stl';
import { mandibleMesh } from './mandible';

@Component({
  selector: 'app-cad-cam',
  imports: [DecimalPipe],
  templateUrl: './cad-cam.html',
  styleUrl: './cad-cam.css',
})
export class CadCam {
  readonly model = signal({ name: 'Mandíbula inferior con muelas del juicio', faces: mandibleMesh() });
  readonly error = signal('');
  readonly busy = signal(false);
  readonly scale = signal(100);
  readonly rotation = signal(0);
  readonly viewAngle = signal(20);
  readonly layerHeight = signal(0.2);
  readonly selectedLayer = signal(1);
  readonly mesh = computed(() => transformMesh(this.model().faces, this.scale() / 100, this.rotation()));
  readonly dimensions = computed(() => bounds(this.mesh()).size);
  readonly layerCount = computed(() => Math.ceil(this.dimensions()[2] / this.layerHeight()));
  readonly layer = computed(() => Math.min(this.selectedLayer(), this.layerCount()));
  readonly sliceZ = computed(() => {
    const start = Math.max(0, (this.layer() - 1) * this.layerHeight());
    return (start + Math.min(start + this.layerHeight(), this.dimensions()[2])) / 2;
  });

  private readonly modelCanvas = viewChild<ElementRef<HTMLCanvasElement>>('modelCanvas');
  private readonly sliceCanvas = viewChild<ElementRef<HTMLCanvasElement>>('sliceCanvas');

  constructor() {
    effect(() => {
      const canvas = this.modelCanvas()?.nativeElement;
      if (canvas) this.drawModel(canvas);
    });
    effect(() => {
      const canvas = this.sliceCanvas()?.nativeElement;
      if (canvas) this.drawSlice(canvas);
    });
  }

  async openFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.error.set('');
    if (!file.name.toLowerCase().endsWith('.stl') || file.size > maxFileBytes) {
      this.error.set('Selecciona un archivo STL de hasta 24 MB.');
      return;
    }

    this.busy.set(true);
    try {
      this.model.set({ name: file.name, faces: readStl(await file.arrayBuffer()) });
      this.resetControls();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo abrir el archivo.');
    } finally {
      this.busy.set(false);
    }
  }

  download(): void {
    const url = URL.createObjectURL(new Blob([writeStl(this.mesh())], { type: 'model/stl' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-ajustado.stl';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private resetControls(): void {
    this.scale.set(100);
    this.rotation.set(0);
    this.viewAngle.set(35);
    this.layerHeight.set(0.2);
    this.selectedLayer.set(1);
  }

  private drawModel(canvas: HTMLCanvasElement): void {
    const context = canvas.getContext('2d');
    if (!context) return;
    const { width, height } = canvas;
    const mesh = this.mesh();
    const [xSize, ySize, zSize] = this.dimensions();
    const factor = 0.85 * Math.min(width, height) / (Math.hypot(xSize, ySize, zSize) || 1);
    const angle = this.viewAngle() * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const project = ([x, y, z]: Point): Point => [
      width / 2 + (x * cos - y * sin) * factor,
      height / 2 - ((x * sin + y * cos) * 0.5 + (z - zSize / 2) * 0.866) * factor,
      -(x * sin + y * cos) * 0.866 + z * 0.5,
    ];

    context.clearRect(0, 0, width, height);
    if (mesh.length <= 20000) {
      const projected = mesh.map(face => {
        const [a, b, c] = face.map(project);
        return { a, b, c, depth: a[2] + b[2] + c[2] };
      });
      projected.sort((left, right) => left.depth - right.depth);
      for (const { a, b, c } of projected) {
        const [ux, uy, uz] = b.map((value, axis) => value - a[axis]);
        const [vx, vy, vz] = c.map((value, axis) => value - a[axis]);
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const light = Math.abs((-0.25 * nx - 0.4 * ny + 0.88 * nz) / (Math.hypot(nx, ny, nz) || 1));
        context.fillStyle = `hsl(43 36% ${43 + 48 * light}%)`;
        context.strokeStyle = context.fillStyle;
        context.lineWidth = 0.65;
        context.beginPath();
        context.moveTo(a[0], a[1]);
        context.lineTo(b[0], b[1]);
        context.lineTo(c[0], c[1]);
        context.closePath();
        context.fill();
        context.stroke();
      }
      return;
    }

    context.strokeStyle = 'rgba(124, 230, 218, 0.58)';
    context.lineWidth = 1;
    context.beginPath();
    const stride = Math.ceil(mesh.length / 12000);
    for (let i = 0; i < mesh.length; i += stride) {
      const [a, b, c] = mesh[i];
      const [start, second, third] = [a, b, c].map(project);
      context.moveTo(start[0], start[1]);
      context.lineTo(second[0], second[1]);
      context.lineTo(third[0], third[1]);
      context.closePath();
    }
    context.stroke();
  }

  private drawSlice(canvas: HTMLCanvasElement): void {
    const context = canvas.getContext('2d');
    if (!context) return;
    const { width, height } = canvas;
    const [xSize, ySize] = this.dimensions();
    const factor = 0.85 * Math.min(width, height) / (Math.max(xSize, ySize) || 1);
    context.clearRect(0, 0, width, height);
    context.strokeStyle = '#7ce6da';
    context.lineWidth = 2;
    context.beginPath();
    for (const [[x1, y1], [x2, y2]] of sliceMesh(this.mesh(), this.sliceZ())) {
      context.moveTo(width / 2 + x1 * factor, height / 2 - y1 * factor);
      context.lineTo(width / 2 + x2 * factor, height / 2 - y2 * factor);
    }
    context.stroke();
  }
}
