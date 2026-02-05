import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassDialog } from '@/components/ui/glass-dialog';

interface CustomerCreationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CustomerData) => void;
}

export interface CustomerData {
    name: string;
    email: string;
    phone: string;
    address: string;
}

export default function CustomerCreationDialog({ isOpen, onClose, onSave }: CustomerCreationDialogProps) {
    const [data, setData] = useState<CustomerData>({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    const handleSave = () => {
        onSave(data);
        setData({ name: '', email: '', phone: '', address: '' });
    };

    const handleClose = () => {
        onClose();
        setData({ name: '', email: '', phone: '', address: '' });
    };

    return (
        <GlassDialog
            isOpen={isOpen}
            onClose={handleClose}
            title="Create New Customer"
            description="Enter customer details below."
            className="max-w-xl"
        >
            <div className="space-y-4">
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Name *</label>
                        <Input
                            value={data.name}
                            onChange={(e) => setData({ ...data, name: e.target.value })}
                            placeholder="Business Name"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Email</label>
                        <Input
                            value={data.email}
                            onChange={(e) => setData({ ...data, email: e.target.value })}
                            placeholder="email@example.com"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Phone</label>
                        <Input
                            value={data.phone}
                            onChange={(e) => setData({ ...data, phone: e.target.value })}
                            placeholder="+974 ..."
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Address</label>
                        <Input
                            value={data.address}
                            onChange={(e) => setData({ ...data, address: e.target.value })}
                            placeholder="Building, Street, Zone"
                        />
                    </div>
                    <div className="flex justify-end pt-2 gap-2">
                        <Button variant="ghost" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            Save Customer
                        </Button>
                    </div>
                </div>
            </div>
        </GlassDialog>
    );
}
