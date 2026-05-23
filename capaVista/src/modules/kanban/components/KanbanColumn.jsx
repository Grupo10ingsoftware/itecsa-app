import KanbanCard from "./KanbanCard";
import styles from "../styles/Kanban.module.css";
import { useState } from "react";
// export const PAYMENT_STATUS = Object.freeze({
//   PENDIENTE: 'Pendiente',
//   CONFIRMADO: 'Confirmado',
//   RECHAZADO: 'Rechazado',
// })

//----------------------
// testeo libreria drag and drop222 
import {useDroppable, DragDropProvider} from '@dnd-kit/react';

const initialOrders = [
    {
      id: 1,
      clientName: "Colegio Andes",
      nv: "NV-6767",
      product: "Lanyards",
      date: "21-05-2026",
      paymentStatus: "",
      orderStatus: "Confirmación de pago",
    },
    {
      id: 2,
      clientName: "Chile",
      nv: "NV-6768",
      product: "Lanyards",
      date: "21-05-2026",
      paymentStatus: "",
      orderStatus: "En producción",
    },
    {
      id: 3,
      clientName: "Bulla de mi vida",
      nv: "NV-6769",
      product: "Lanyards",
      date: "21-05-2026",
      paymentStatus: "",
      orderStatus: "Listo para entrega",
    },
]

const columns = [
    {
      title: "Confirmación de pago",
      color: "#B388FF",
    },
    {
      title: "Listo para producción",
      color: "#64B5F6",
    },
    {
      title: "En producción",
      color: "#F4A261",
    },
    {
      title: "Listo para entrega",
      color: "#7ED957",
    },
  ];


function Droppable({id, children}) {
  const {ref} = useDroppable({
    id,
  });

  return (
    <div ref={ref} className={`${styles["k-columns-container"]} rounded p-3`}>
      {children}
    </div>
  );
}

function KanbanColumn() {
  const [orders, setOrders] = useState(initialOrders);

    function handleDragEnd(event) {
        if (event.canceled) return;

        const { source, target } = event.operation;
        if (!source || !target) return;

        
        setOrders((prev) =>
            prev.map((order) =>
            order.nv === source.id  
                ? { ...order, orderStatus: target.id }
                : order
            )
        );
    }

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className={styles["kanban-wrapper"]}>
        {columns.map((column) => (
          <Droppable key={column.title} id={column.title}>
            <div
              className={`rounded text-center fw-bold mb-3 ${styles["column-title"]}`}
              style={{ backgroundColor: column.color, padding: "10px" }}
            >
              {column.title}
            </div>
            {orders
              .filter((order) => column.title === order.orderStatus)
              .map((order) => (
                <KanbanCard key={order.id} {...order} />
              ))}
          </Droppable>
        ))}
      </div>
    </DragDropProvider>
  );
}

export default KanbanColumn;