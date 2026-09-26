import { AppError } from "../../../errors/AppError.js";
import ProductionLoadRepository, { LANYARD_DAILY_CAPACITY } from "../repo/productionLoad.repo.js";
import { UserRepository } from "../../users/repo/users.repo.js";

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(value) {
  if (value === undefined || value === null || value === "") return todayKey();
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const error = new AppError(400, "La fecha debe tener formato YYYY-MM-DD.");
    throw error;
  }
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    const error = new AppError(400, "La fecha no es valida.");
    throw error;
  }
  return text;
}

function normalizeEntries(entries) {
  if (!Array.isArray(entries)) {
    const error = new AppError(400, "Debe enviar una lista de cargas por detalle.");
    throw error;
  }

  return entries.map((entry) => {
    const detailId = Number(entry?.detailId ?? entry?.id_detalle_pedido);
    const quantity = Number(entry?.quantity ?? entry?.cantidad_dia);
    if (!Number.isInteger(detailId) || detailId <= 0) {
      const error = new AppError(400, "Cada carga debe incluir un detalle valido.");
      throw error;
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      const error = new AppError(400, "La cantidad diaria debe ser un entero mayor o igual a cero.");
      throw error;
    }
    return {
      detailId,
      quantity,
      observation: typeof entry?.observation === "string" ? entry.observation : entry?.observacion,
    };
  });
}

function summarize(details, capacity) {
  const lanyardsInProduction = details.reduce((total, detail) => total + Number(detail.dailyQuantity ?? 0), 0);
  const percentage = capacity > 0 ? Math.round((lanyardsInProduction / capacity) * 100) : 0;

  return {
    capacity,
    lanyardsInProduction,
    percentage,
  };
}

export default class ProductionLoadService {
  constructor({ repo, userRepo } = {}) {
    this.repo = repo ?? new ProductionLoadRepository();
    this.userRepo = userRepo ?? new UserRepository();
  }

  async getDailyLoad({ date } = {}) {
    const dateKey = normalizeDateKey(date);
    const capacity = await this.repo.getCapacity();
    const details = await this.repo.listLanyardDetails(dateKey);

    return {
      date: dateKey,
      ...summarize(details, capacity || LANYARD_DAILY_CAPACITY),
      details,
    };
  }

  async saveDailyLoad({ date, entries, auth0UserId } = {}) {
    const dateKey = normalizeDateKey(date);
    const normalizedEntries = normalizeEntries(entries);
    const user = await this.userRepo.findByAuth0Id(auth0UserId);

    if (!user?.idUsuario) {
      const error = new AppError(403, "No existe un usuario interno vinculado a la sesion.");
      throw error;
    }

    const capacity = await this.repo.getCapacity();
    await this.repo.updateDailyLoads({
      dateKey,
      entries: normalizedEntries,
      userId: user.idUsuario,
      capacity: capacity || LANYARD_DAILY_CAPACITY,
    });

    return this.getDailyLoad({ date: dateKey });
  }
}
