import { requirements, sources, type Doc, type Project } from './udyog';

export type ProfileValue = string | number | boolean;
export type ProjectProfile = Project & {
  projectType?: 'Greenfield' | 'Expansion' | 'Modernisation' | 'Operating unit';
  investmentCr?: number;
  landArea?: number;
  builtUpArea?: number;
  workerCount?: number;
  electricityLoadKw?: number;
  wastewater?: boolean;
  boiler?: boolean;
  hazardous?: boolean;
  groundwater?: boolean;
  highVoltage?: boolean;
  sensitiveArea?: boolean;
};

export const profileLabels = {
  en: { projectType: 'Project type', stage: 'Project stage', district: 'District', investmentCr: 'Investment (₹ crore)', landArea: 'Land area (sq m)', builtUpArea: 'Built-up area (sq m)', workerCount: 'Worker count', electricityLoadKw: 'Electricity load (kW)', wastewater: 'Process wastewater', boiler: 'Boiler / thermic fluid heater', hazardous: 'Hazardous materials', groundwater: 'Groundwater extraction', highVoltage: 'High-voltage installation', sensitiveArea: 'Sensitive / protected area' },
  mr: { projectType: 'प्रकल्पाचा प्रकार', stage: 'प्रकल्पाचा टप्पा', district: 'जिल्हा', investmentCr: 'गुंतवणूक (₹ कोटी)', landArea: 'जमिनीचे क्षेत्रफळ (चौ. मी.)', builtUpArea: 'बांधकाम क्षेत्रफळ (चौ. मी.)', workerCount: 'कामगार संख्या', electricityLoadKw: 'वीज भार (kW)', wastewater: 'प्रक्रिया सांडपाणी', boiler: 'बॉयलर / थर्मिक फ्लुइड हीटर', hazardous: 'धोकादायक पदार्थ', groundwater: 'भूजल उपसा', highVoltage: 'उच्च-दाब विद्युत स्थापना', sensitiveArea: 'संवेदनशील / संरक्षित क्षेत्र' },
} as const;

export const projectTypes: ProjectProfile['projectType'][] = ['Greenfield', 'Expansion', 'Modernisation', 'Operating unit'];
export const districts = ['Pune', 'Mumbai City', 'Thane', 'Nashik', 'Nagpur', 'Chhatrapati Sambhajinagar', 'Kolhapur', 'Other Maharashtra district'];
export function profileOf(project: Project): ProjectProfile { return project as ProjectProfile; }
export function exactDocumentSet(project: Project): string[] { return [...new Set(requirements(project).flatMap(item => item.docs))]; }
export function sourceStatus(sourceIds: string[], docs: Doc[], project: Project) {
  return requirements(project).map(item => ({ id: item.id, title: item.title, source: item.source, verified: sourceIds.includes(item.id) || sourceIds.includes(item.source), documentCount: item.docs.filter(id => docs.some(doc => doc.id === id && doc.file)).length }));
}
export const officialSources = { ...sources };
