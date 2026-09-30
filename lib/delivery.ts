import { prisma } from "@/lib/prisma";

export type DeliveryFields = {
  driverName: string | null;
  driverIdNumber: string | null;
  vehiclePlate: string | null;
  deliveryControlNumber: string | null;
  deliveryPrinterInfo: string | null;
};

export async function getDeliveryFields(orderId: number): Promise<DeliveryFields | null> {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    select: {
      driverName: true,
      driverIdNumber: true,
      vehiclePlate: true,
      deliveryControlNumber: true,
      deliveryPrinterInfo: true,
    },
  });
  return order;
}

export type DeliveryInput = {
  driverName: string;
  driverIdNumber: string;
  vehiclePlate: string;
  deliveryControlNumber: string;
  deliveryPrinterInfo: string;
};

export async function saveDeliveryFields(orderId: number, input: DeliveryInput) {
  const clean = (value: string) => value.trim() || null;
  await prisma.salesOrder.update({
    where: { id: orderId },
    data: {
      driverName: clean(input.driverName),
      driverIdNumber: clean(input.driverIdNumber),
      vehiclePlate: clean(input.vehiclePlate)?.toUpperCase() ?? null,
      deliveryControlNumber: clean(input.deliveryControlNumber),
      deliveryPrinterInfo: clean(input.deliveryPrinterInfo),
    },
  });
}

export type DeliveryCustomer = {
  name: string;
  company: string | null;
  taxId: string | null;
  phone: string | null;
  address: string | null;
};

export async function getDeliveryCustomer(customerId: number | null): Promise<DeliveryCustomer | null> {
  if (customerId == null) return null;
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { name: true, company: true, taxId: true, phone: true, address: true },
  });
  return customer;
}
