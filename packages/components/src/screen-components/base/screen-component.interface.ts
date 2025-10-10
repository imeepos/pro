import { OnInit, OnDestroy } from '@angular/core';

export interface IScreenComponent extends OnInit, OnDestroy {
  config?: any;
  onConfigChange?(config: any): void;
}