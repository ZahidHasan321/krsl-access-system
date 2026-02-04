import { Users, Truck, Briefcase, Store, Layers, HardHat, UserCheck, User } from 'lucide-svelte';

export interface Category {
    id: string;
    name: string;
    slug: string;
    icon: any;
    color: string;
    parentId: string | null;
}

export const CATEGORIES: Category[] = [
    {
        id: 'customer',
        name: 'Customer',
        slug: 'customer',
        icon: Users,
        color: 'blue',
        parentId: null
    },
    {
        id: 'vendor',
        name: 'Vendor',
        slug: 'vendor',
        icon: Truck,
        color: 'orange',
        parentId: null
    },
    {
        id: 'supplier',
        name: 'Supplier',
        slug: 'supplier',
        icon: Store,
        color: 'amber',
        parentId: 'vendor'
    },
    {
        id: '3rd-party',
        name: '3rd Party',
        slug: '3rd-party',
        icon: Users,
        color: 'orange',
        parentId: 'vendor'
    },
    {
        id: 'employee',
        name: 'Employee',
        slug: 'employee',
        icon: Briefcase,
        color: 'emerald',
        parentId: null
    },
    {
        id: 'dokandari',
        name: 'Dokandari',
        slug: 'dokandari',
        icon: Store,
        color: 'sky',
        parentId: 'customer'
    },
    {
        id: 'rolling',
        name: 'Rolling',
        slug: 'rolling',
        icon: Layers,
        color: 'indigo',
        parentId: 'customer'
    },
    {
        id: 'outfitting',
        name: 'Outfitting',
        slug: 'outfitting',
        icon: HardHat,
        color: 'cyan',
        parentId: 'customer'
    },
    {
        id: 'management',
        name: 'Management',
        slug: 'management',
        icon: UserCheck,
        color: 'teal',
        parentId: 'employee'
    },
    {
        id: 'frontliner',
        name: 'Frontliner',
        slug: 'frontliner',
        icon: User,
        color: 'green',
        parentId: 'employee'
    }
];

export const ROOT_CATEGORIES = CATEGORIES.filter(c => !c.parentId);

export function getSubCategories(parentId: string) {
    return CATEGORIES.filter(c => c.parentId === parentId);
}

export function getCategoryById(id: string) {
    return CATEGORIES.find(c => c.id === id);
}
