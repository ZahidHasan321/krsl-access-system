import { Users, Truck, Briefcase, Store, Layers, HardHat, UserCheck, User, Wrench, ShoppingCart, UserCircle } from 'lucide-svelte';

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
        icon: UserCircle,
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
        icon: ShoppingCart,
        color: 'indigo',
        parentId: 'customer'
    },
    {
        id: 'outfitting',
        name: 'Outfitting',
        slug: 'outfitting',
        icon: Wrench,
        color: 'cyan',
        parentId: 'customer'
    },
    {
        id: 'management',
        name: 'Management',
        slug: 'management',
        icon: Briefcase,
        color: 'teal',
        parentId: 'employee'
    },
    {
        id: 'frontliner',
        name: 'Frontliner',
        slug: 'frontliner',
        icon: HardHat,
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
