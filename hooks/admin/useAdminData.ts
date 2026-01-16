
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Order, Staff, Customer, Category, AdminNotification } from '../../types';

export const useAdminData = (addNotification: (n: AdminNotification) => void) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchOrders = useCallback(async () => {
        const { data } = await supabase.from('orders').select('*').order('date', { ascending: false });
        if (data) {
            const formattedOrders = data.map((o: any) => ({
                id: o.id,
                items: o.items,
                total: o.total,
                status: o.status,
                paymentMethod: o.payment_method, 
                customerName: o.customer_name,
                customerEmail: o.customer_email,
                customerPhone: o.customer_phone,
                customerCity: o.customer_city,
                deliveryMode: o.delivery_mode || 'delivery',
                date: new Date(o.date).toLocaleDateString('fr-FR')
            }));
            setOrders(formattedOrders);
        }
    }, []);

    const fetchStaff = useCallback(async () => {
        const { data } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
        if (data) setStaffMembers(data as Staff[]);
    }, []);

    const fetchCustomers = useCallback(async () => {
        const { data } = await supabase.from('customers').select('*').order('total_spent', { ascending: false });
        if (data) setCustomers(data as Customer[]);
    }, []);

    const fetchCategories = useCallback(async () => {
        const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
        if (data) setCategories(data as Category[]);
    }, []);

    const refreshAll = useCallback(async () => {
        await Promise.all([fetchOrders(), fetchStaff(), fetchCustomers(), fetchCategories()]);
    }, [fetchOrders, fetchStaff, fetchCustomers, fetchCategories]);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await refreshAll();
            setIsLoading(false);
        };
        init();

        const channel = supabase.channel('admin-db-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
            const newOrder = payload.new as any;
            addNotification({
                id: crypto.randomUUID(),
                type: 'order',
                title: 'Nouvelle Commande !',
                message: `Commande #${newOrder.id} reçue. Montant: ${newOrder.total} FCFA`,
                timestamp: new Date(),
                read: false,
                linkToTab: 'orders'
            });
            fetchOrders(); 
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'repair_tickets' }, (payload) => {
            const newTicket = payload.new as any;
            addNotification({
                id: crypto.randomUUID(),
                type: 'ticket',
                title: 'Nouveau Ticket SAV',
                message: `Ticket #${newTicket.id} créé pour ${newTicket.product_name}.`,
                timestamp: new Date(),
                read: false,
                linkToTab: 'sav'
            });
        })
        .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [addNotification, fetchOrders, refreshAll]);

    return {
        orders, setOrders,
        staffMembers, setStaffMembers,
        customers,
        categories, setCategories,
        isLoading,
        refreshAll
    };
};
