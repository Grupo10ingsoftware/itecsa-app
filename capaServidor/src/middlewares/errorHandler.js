export function notFoundHandler(req, res) {
    return res.status(404).json({
        code: "NOT_FOUND",
        message: "Recurso no encontrado.",
        requestId: req.requestId,
    });
}
