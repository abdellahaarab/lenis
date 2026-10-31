import { describe, it, expect } from 'vitest';
import {
  extractProcessorFamily,
  extractProcessorBrand,
  extractCpuGen,
  extractGraphicsInfo,
  sortRamOptions,
  sortStorageOptions,
  sortScreenSizes,
  sortBrands,
  computeLaptopFacets,
  type NormalizedLaptopItem
} from '@aljeel/shared';

describe('Laptop Filter Service - Logic & Intelligence', () => {
  it('correctly extracts CPU family from raw strings', () => {
    expect(extractProcessorFamily('Intel Core i7-11850H @ 2.50GHz')).toBe('Core i7');
    expect(extractProcessorFamily('Intel Core i5-8265U')).toBe('Core i5');
    expect(extractProcessorFamily('Intel Core i9-13900HX')).toBe('Core i9');
    expect(extractProcessorFamily('Intel Core i3-1115G4')).toBe('Core i3');
    expect(extractProcessorFamily('Intel Core Ultra 7 155H')).toBe('Core Ultra 7');
    expect(extractProcessorFamily('AMD Ryzen 7 5800H with Radeon Graphics')).toBe('Ryzen 7');
    expect(extractProcessorFamily('AMD Ryzen 5 5600U')).toBe('Ryzen 5');
    expect(extractProcessorFamily('Apple M2 Pro')).toBe('Apple M2');
    expect(extractProcessorFamily('Apple M3 Max')).toBe('Apple M3');
    expect(extractProcessorFamily('Intel Xeon E-2276M')).toBe('Xeon');
    expect(extractProcessorFamily('')).toBe('Other');
  });

  it('extracts CPU brand accurately', () => {
    expect(extractProcessorBrand('Intel Core i7-11850H')).toBe('Intel');
    expect(extractProcessorBrand('AMD Ryzen 7 5800H')).toBe('AMD');
    expect(extractProcessorBrand('Apple M2')).toBe('Apple');
    expect(extractProcessorBrand('Qualcomm Snapdragon X Elite')).toBe('Qualcomm');
  });

  it('extracts CPU generations properly', () => {
    expect(extractCpuGen('Intel Core i7-11850H')).toBe(11);
    expect(extractCpuGen('Intel Core i5-8265U')).toBe(8);
    expect(extractCpuGen('Intel Core i7-10610U')).toBe(10);
    expect(extractCpuGen('Intel Core i9-13900H')).toBe(13);
    expect(extractCpuGen('Intel Core i5-14400H')).toBe(14);
    expect(extractCpuGen('AMD Ryzen 7 7840HS')).toBe(7);
    expect(extractCpuGen(undefined, 12)).toBe(12);
  });

  it('classifies GPU into integrated vs dedicated and extracts family and VRAM', () => {
    const rtx = extractGraphicsInfo('NVIDIA GeForce RTX 4060 8GB GDDR6');
    expect(rtx.isDedicated).toBe(true);
    expect(rtx.type).toBe('dedicated');
    expect(rtx.family).toBe('NVIDIA RTX 40-Series');
    expect(rtx.vramGB).toBe(8);

    const workstation = extractGraphicsInfo('NVIDIA RTX A2000 4GB GDDR6');
    expect(workstation.isDedicated).toBe(true);
    expect(workstation.type).toBe('dedicated');
    expect(workstation.family).toBe('NVIDIA RTX Pro / Workstation');
    expect(workstation.vramGB).toBe(4);

    const intelIris = extractGraphicsInfo('Intel Iris Xe Graphics');
    expect(intelIris.isDedicated).toBe(false);
    expect(intelIris.type).toBe('integrated');
    expect(intelIris.family).toBe('Intel Iris Xe');
    expect(intelIris.vramGB).toBe(0);

    const intelUhd = extractGraphicsInfo('Intel UHD Graphics 620');
    expect(intelUhd.isDedicated).toBe(false);
    expect(intelUhd.type).toBe('integrated');
    expect(intelUhd.family).toBe('Intel UHD Graphics');
  });

  it('sorts RAM, Storage, and Screen sizes in logical hierarchy rather than alphabetical', () => {
    expect(sortRamOptions([16, 4, 32, 8, 64])).toEqual([4, 8, 16, 32, 64]);
    expect(sortStorageOptions([512, 1024, 256, 2048, 128])).toEqual([128, 256, 512, 1024, 2048]);
    expect(sortScreenSizes([14, 15.6, 13.3, 16, 17.3])).toEqual([17.3, 16, 15.6, 14, 13.3]);
    expect(sortBrands(['Dell', 'Unknown', 'Lenovo', 'HP', 'Apple'])).toEqual([
      'Lenovo',
      'HP',
      'Dell',
      'Apple',
      'Unknown'
    ]);
  });

  it('computes disjunctive multi-select facet counts accurately', () => {
    const mockLaptops: NormalizedLaptopItem[] = [
      {
        id: 'lap-1',
        brand: 'Lenovo',
        condition: 'A',
        priceUsd: 650,
        available: true,
        specs: {
          cpu: 'Intel Core i5-1135G7',
          cpuFamily: 'Core i5',
          cpuGen: 11,
          ramGB: 16,
          storageGB: 512,
          screenSize: 14,
          gpuType: 'integrated'
        },
        raw: {}
      },
      {
        id: 'lap-2',
        brand: 'Lenovo',
        condition: 'A',
        priceUsd: 1200,
        available: true,
        specs: {
          cpu: 'Intel Core i7-11850H',
          cpuFamily: 'Core i7',
          cpuGen: 11,
          ramGB: 32,
          storageGB: 1024,
          screenSize: 16,
          gpuType: 'dedicated'
        },
        raw: {}
      },
      {
        id: 'lap-3',
        brand: 'HP',
        condition: 'B',
        priceUsd: 500,
        available: true,
        specs: {
          cpu: 'Intel Core i5-10210U',
          cpuFamily: 'Core i5',
          cpuGen: 10,
          ramGB: 8,
          storageGB: 256,
          screenSize: 14,
          gpuType: 'integrated'
        },
        raw: {}
      },
      {
        id: 'lap-4',
        brand: 'Dell',
        condition: 'new',
        priceUsd: 1500,
        available: true,
        specs: {
          cpu: 'Intel Core i7-13700H',
          cpuFamily: 'Core i7',
          cpuGen: 13,
          ramGB: 16,
          storageGB: 1024,
          screenSize: 15.6,
          gpuType: 'dedicated'
        },
        raw: {}
      }
    ];

    // Filter by Brand = Lenovo
    const facetsWhenLenovoSelected = computeLaptopFacets(mockLaptops, {
      brand: ['Lenovo']
    });

    // In disjunctive faceting:
    // 1) The brands dimension should still show counts for ALL brands (because we don't exclude other brands from being selected)
    const lenovoBrand = facetsWhenLenovoSelected.brands.find(b => b.value === 'Lenovo');
    const hpBrand = facetsWhenLenovoSelected.brands.find(b => b.value === 'HP');
    const dellBrand = facetsWhenLenovoSelected.brands.find(b => b.value === 'Dell');
    expect(lenovoBrand?.count).toBe(2);
    expect(hpBrand?.count).toBe(1);
    expect(dellBrand?.count).toBe(1);

    // 2) The CPU family dimension should ONLY count the laptops matching Brand = Lenovo (one i5, one i7)
    const i5Count = facetsWhenLenovoSelected.cpuFamilies.find(c => c.value === 'Core i5')?.count;
    const i7Count = facetsWhenLenovoSelected.cpuFamilies.find(c => c.value === 'Core i7')?.count;
    expect(i5Count).toBe(1);
    expect(i7Count).toBe(1);

    // 3) GPU Types for Lenovo: 1 integrated, 1 dedicated
    const dedGpu = facetsWhenLenovoSelected.gpuTypes.find(g => g.value === 'dedicated')?.count;
    const intGpu = facetsWhenLenovoSelected.gpuTypes.find(g => g.value === 'integrated')?.count;
    expect(dedGpu).toBe(1);
    expect(intGpu).toBe(1);
  });
});

