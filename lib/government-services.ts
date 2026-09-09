export type GovernmentService = {
  id: string;
  name: string;
  department: string;
  description: string;
  officialUrl: string;
  applicationUrl?: string;
  source: string;
  version: string;
  status: 'active' | 'verify';
  typicalTimeline: string;
};

export const governmentServices = {
  fire: {
    id: 'fire-safety',
    name: 'Fire safety approval',
    department: 'Maharashtra Fire & Emergency Services',
    description: 'Fire prevention and life-safety review for applicable premises.',
    officialUrl: 'https://mahafireservice.gov.in/',
    source: 'Maharashtra Fire & Emergency Services',
    version: '2026-01',
    status: 'verify',
    typicalTimeline: 'Typically 30 days after a complete submission; verify locally.',
  },
  power: {
    id: 'electricity-connection',
    name: 'Electricity connection',
    department: 'Maharashtra State Electricity Distribution Co. Ltd.',
    description: 'New or enhanced electricity supply for a commercial or industrial premise.',
    officialUrl: 'https://www.mahadiscom.in/',
    source: 'MSEDCL',
    version: '2026-01',
    status: 'verify',
    typicalTimeline: 'Varies by load, network extension and inspection; verify the service SLA.',
  },
  mpcb: {
    id: 'mpcb-consent',
    name: 'MPCB consent',
    department: 'Maharashtra Pollution Control Board',
    description: 'Consent to Establish or Consent to Operate under applicable pollution-control law.',
    officialUrl: 'https://www.mpcb.gov.in/en/consentmgt/water-and-air-act',
    source: 'Maharashtra Pollution Control Board',
    version: '2026-01',
    status: 'verify',
    typicalTimeline: 'Varies by category and completeness; check the current MPCB service standard.',
  },
  factoryPlan: {
    id: 'factory-plan',
    name: 'Factory plan approval',
    department: 'Directorate of Industrial Safety and Health, Maharashtra',
    description: 'Approval or registration review for a factory layout and manufacturing premises.',
    officialUrl: 'https://mahadish.in/',
    source: 'Directorate of Industrial Safety and Health',
    version: '2026-01',
    status: 'verify',
    typicalTimeline: 'Typically 30 days for a complete plan submission; verify current rules.',
  },
} satisfies Record<string, GovernmentService>;

export const governmentServiceList: GovernmentService[] = Object.values(governmentServices);

export const services = governmentServices;
