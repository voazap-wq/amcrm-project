
"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Car, Search, ArrowUpDown, Pencil, FileText } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import type { Car as CarType, Customer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AppLayout } from "@/app/components/app-layout";

type SortConfig = {
  key: keyof CarType | 'owner';
  direction: "ascending" | "descending";
};

type CarWithCustomer = CarType & { customer?: Customer };

function CarTable({
    cars,
    isLoading,
    onSort,
    sortConfig,
    onStatusChange,
    }: {
    cars: CarWithCustomer[],
    isLoading: boolean,
    onSort: (key: keyof CarType | 'owner') => void,
    sortConfig: SortConfig | null,
    onStatusChange: (carId: string, active: boolean) => void;
}) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!cars || cars.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        Нет автомобилей.
      </div>
    );
  }
  
  const renderSortArrow = (key: keyof CarType | 'owner') => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Button variant="ghost" onClick={() => onSort('make')}>Марка {renderSortArrow('make')}</Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => onSort('model')}>Модель {renderSortArrow('model')}</Button>
          </TableHead>
          <TableHead>
             <Button variant="ghost" onClick={() => onSort('year')}>Год {renderSortArrow('year')}</Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => onSort('vin')}>VIN {renderSortArrow('vin')}</Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => onSort('owner')}>Владелец {renderSortArrow('owner')}</Button>
          </TableHead>
          <TableHead>Статус</TableHead>
          <TableHead className="text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cars.map((car) => (
          <TableRow key={car.id}>
            <TableCell>{car.make}</TableCell>
            <TableCell>{car.model}</TableCell>
            <TableCell>{car.year || '-'}</TableCell>
            <TableCell>{car.vin || '-'}</TableCell>
            <TableCell>{car.customer ? `${car.customer.lastName} ${car.customer.firstName}` : 'Неизвестен'}</TableCell>
            <TableCell>
              <Switch
                checked={car.active}
                onCheckedChange={(checked) => onStatusChange(car.id, checked)}
                aria-label="Car status"
              />
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                    {car.comments && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-default">
                                <FileText className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs whitespace-normal text-left">
                            <p>{car.comments}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/cars/${car.id}`)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function CarsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showInactive, setShowInactive] = React.useState(false);
  const [sortConfig, setSortConfig] = React.useState<SortConfig | null>({ key: 'make', direction: 'ascending' });

  const carsRef = useMemoFirebase(() => (firestore ? collection(firestore, "cars") : null), [firestore]);
  const { data: cars, isLoading: areCarsLoading } = useCollection<CarType>(carsRef);
  
  const clientsRef = useMemoFirebase(() => (firestore ? collection(firestore, "clients") : null), [firestore]);
  const { data: clients, isLoading: areClientsLoading } = useCollection<Customer>(clientsRef);

  const isLoading = areCarsLoading || areClientsLoading;

  const carsWithOwners = React.useMemo(() => {
    if (!cars || !clients) return [];
    return cars.map(car => {
      const owner = clients.find(client => client.id === car.clientId);
      return { ...car, customer: owner };
    });
  }, [cars, clients]);

  const filteredAndSortedCars = React.useMemo(() => {
    if (!carsWithOwners) return [];
    
    let filtered = carsWithOwners.filter(car => {
        if (!showInactive && !car.active) {
            return false;
        }
        const searchTermLower = searchTerm.toLowerCase();
        const ownerName = car.customer ? `${car.customer.lastName} ${car.customer.firstName}`.toLowerCase() : '';
        return (
            (car.make || '').toLowerCase().includes(searchTermLower) ||
            (car.model || '').toLowerCase().includes(searchTermLower) ||
            (car.vin || '').toLowerCase().includes(searchTermLower) ||
            ownerName.includes(searchTermLower)
        );
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        const aValue = sortConfig.key === 'owner' ? (a.customer ? `${a.customer.lastName} ${a.customer.firstName}` : '') : a[sortConfig.key] || '';
        const bValue = sortConfig.key === 'owner' ? (b.customer ? `${b.customer.lastName} ${b.customer.firstName}` : '') : b[sortConfig.key] || '';
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            const comparison = aValue.localeCompare(bValue, 'ru');
            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        }

        return 0;
      });
    }

    return filtered;
  }, [carsWithOwners, searchTerm, sortConfig, showInactive]);

  const handleSort = (key: keyof CarType | 'owner') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleStatusChange = (carId: string, active: boolean) => {
    if (!firestore) return;
    const carDocRef = doc(firestore, 'cars', carId);
    updateDocumentNonBlocking(carDocRef, { active });
    toast({
      title: "Статус обновлен",
      description: `Автомобиль был ${active ? 'активирован' : 'деактивирован'}.`,
    });
  };

  return (
    <AppLayout pageTitle="Автомобили">
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4 mb-4">
            <form className="ml-auto flex-1 sm:flex-initial">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Поиск по автомобилям..."
                        className="pl-8 sm:w-[200px] lg:w-[300px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </form>
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="show-inactive"
                    checked={showInactive}
                    onCheckedChange={(checked) => setShowInactive(checked as boolean)}
                />
                <Label htmlFor="show-inactive" className="text-sm font-medium">
                    Показать неактивные
                </Label>
            </div>
            <Button asChild>
                <Link href="/cars/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Добавить автомобиль
                </Link>
            </Button>
        </div>
        <Card>
            <CardHeader>
            <CardTitle>Автомобили</CardTitle>
            <CardDescription>
                Список всех автомобилей ваших клиентов.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <CarTable
                cars={filteredAndSortedCars}
                isLoading={isLoading}
                onSort={handleSort}
                sortConfig={sortConfig}
                onStatusChange={handleStatusChange}
            />
            </CardContent>
        </Card>
    </AppLayout>
  );
}