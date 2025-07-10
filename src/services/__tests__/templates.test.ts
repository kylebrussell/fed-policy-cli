// /src/services/__tests__/templates.test.ts
import { ECONOMIC_TEMPLATES } from '../../constants';

describe('Economic Templates', () => {
  describe('Template Structure Validation', () => {
    Object.entries(ECONOMIC_TEMPLATES).forEach(([id, template]) => {
      describe(`Template: ${id}`, () => {
        it('should have required fields', () => {
          expect(template.id).toBe(id);
          expect(template.name).toBeDefined();
          expect(template.description).toBeDefined();
          expect(template.category).toBeDefined();
          expect(template.indicators).toBeDefined();
          expect(template.economicRationale).toBeDefined();
        });

        it('should have valid category', () => {
          const validCategories = ['crisis', 'policy', 'inflation', 'recession', 'general'];
          expect(validCategories).toContain(template.category);
        });

        it('should have proper indicator weights', () => {
          expect(template.indicators).toBeDefined();
          expect(Array.isArray(template.indicators)).toBe(true);
          expect(template.indicators.length).toBeGreaterThan(0);

          // Check that weights sum to 1.0 (within tolerance)
          const totalWeight = template.indicators.reduce((sum, indicator) => sum + indicator.weight, 0);
          expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.001);

          // Check that all indicators have valid IDs and weights
          template.indicators.forEach(indicator => {
            expect(indicator.id).toBeDefined();
            expect(typeof indicator.weight).toBe('number');
            expect(indicator.weight).toBeGreaterThan(0);
            expect(indicator.weight).toBeLessThanOrEqual(1);
          });
        });

        it('should have meaningful descriptions', () => {
          expect(template.description.length).toBeGreaterThan(20);
          expect(template.economicRationale.length).toBeGreaterThan(30);
        });
      });
    });
  });

  describe('Template Categories', () => {
    it('should have templates in each category', () => {
      const categories = ['crisis', 'policy', 'inflation', 'recession', 'general'];
      const templatesByCategory = {};
      
      Object.values(ECONOMIC_TEMPLATES).forEach(template => {
        templatesByCategory[template.category] = (templatesByCategory[template.category] || 0) + 1;
      });

      categories.forEach(category => {
        expect(templatesByCategory[category]).toBeGreaterThan(0);
      });
    });

    it('should have appropriate number of templates', () => {
      const templateCount = Object.keys(ECONOMIC_TEMPLATES).length;
      expect(templateCount).toBeGreaterThanOrEqual(5); // At least 5 templates
      expect(templateCount).toBeLessThanOrEqual(15); // Not too many to be overwhelming
    });
  });

  describe('Specific Template Logic', () => {
    it('stagflation-hunt should focus on unemployment and inflation', () => {
      const template = ECONOMIC_TEMPLATES['stagflation-hunt'];
      
      // Should have high weights on UNRATE and CPIAUCSL
      const unrateWeight = template.indicators.find(i => i.id === 'UNRATE')?.weight;
      const cpiWeight = template.indicators.find(i => i.id === 'CPIAUCSL')?.weight;
      
      expect(unrateWeight).toBeGreaterThanOrEqual(0.3);
      expect(cpiWeight).toBeGreaterThanOrEqual(0.3);
      
      // Should focus on stagflation-related eras
      expect(template.focusEras).toContain('stagflation');
    });

    it('financial-crisis should include stress indicators', () => {
      const template = ECONOMIC_TEMPLATES['financial-crisis'];
      
      // Should include unemployment, yield curve, and claims
      const indicatorIds = template.indicators.map(i => i.id);
      expect(indicatorIds).toContain('UNRATE');
      expect(indicatorIds).toContain('T10Y2Y');
      expect(indicatorIds).toContain('ICSA');
    });

    it('policy-tightening should weight Fed funds rate highly', () => {
      const template = ECONOMIC_TEMPLATES['policy-tightening'];
      
      const dffWeight = template.indicators.find(i => i.id === 'DFF')?.weight;
      expect(dffWeight).toBeGreaterThanOrEqual(0.3); // Should be primary indicator
    });

    it('balanced-economic should have equal weights', () => {
      const template = ECONOMIC_TEMPLATES['balanced-economic'];
      
      // All weights should be equal (0.2 each for 5 indicators)
      template.indicators.forEach(indicator => {
        expect(Math.abs(indicator.weight - 0.2)).toBeLessThan(0.001);
      });
      
      expect(template.indicators.length).toBe(5);
    });
  });

  describe('Template Default Parameters', () => {
    it('should have sensible default parameters where specified', () => {
      Object.values(ECONOMIC_TEMPLATES).forEach(template => {
        if (template.defaultParams) {
          // If excludeRecentYears is specified, should be reasonable
          if (template.defaultParams.excludeRecentYears) {
            expect(template.defaultParams.excludeRecentYears).toBeGreaterThan(0);
            expect(template.defaultParams.excludeRecentYears).toBeLessThan(50);
          }
          
          // If months is specified, should be reasonable
          if (template.defaultParams.months) {
            expect(template.defaultParams.months).toBeGreaterThan(0);
            expect(template.defaultParams.months).toBeLessThan(60);
          }
        }
      });
    });

    it('stagflation-hunt should exclude recent years by default', () => {
      const template = ECONOMIC_TEMPLATES['stagflation-hunt'];
      expect(template.defaultParams?.excludeRecentYears).toBeGreaterThan(10);
    });

    it('recession-early-warning should use shorter window', () => {
      const template = ECONOMIC_TEMPLATES['recession-early-warning'];
      expect(template.defaultParams?.months).toBeLessThan(12);
    });
  });

  describe('Template Examples', () => {
    it('should provide meaningful examples', () => {
      Object.values(ECONOMIC_TEMPLATES).forEach(template => {
        if (template.examples) {
          expect(Array.isArray(template.examples)).toBe(true);
          expect(template.examples.length).toBeGreaterThan(0);
          
          template.examples.forEach(example => {
            expect(typeof example).toBe('string');
            expect(example.length).toBeGreaterThan(10);
          });
        }
      });
    });
  });

  describe('Template Completeness', () => {
    it('should cover major economic analysis scenarios', () => {
      const templateIds = Object.keys(ECONOMIC_TEMPLATES);
      
      // Should have templates for major economic scenarios
      expect(templateIds.some(id => id.includes('stagflation'))).toBe(true);
      expect(templateIds.some(id => id.includes('crisis'))).toBe(true);
      expect(templateIds.some(id => id.includes('policy'))).toBe(true);
      expect(templateIds.some(id => id.includes('recession'))).toBe(true);
      expect(templateIds.some(id => id.includes('inflation'))).toBe(true);
    });

    it('should use all available indicators across templates', () => {
      const allIndicators = ['UNRATE', 'CPIAUCSL', 'DFF', 'PCEPI', 'GDPC1', 'T10Y2Y', 'ICSA'];
      const usedIndicators = new Set();
      
      Object.values(ECONOMIC_TEMPLATES).forEach(template => {
        template.indicators.forEach(indicator => {
          usedIndicators.add(indicator.id);
        });
      });
      
      // Should use most available indicators across all templates
      expect(usedIndicators.size).toBeGreaterThanOrEqual(6);
      
      // Check that major indicators are used
      expect(usedIndicators.has('UNRATE')).toBe(true);
      expect(usedIndicators.has('CPIAUCSL')).toBe(true);
      expect(usedIndicators.has('DFF')).toBe(true);
    });
  });
});