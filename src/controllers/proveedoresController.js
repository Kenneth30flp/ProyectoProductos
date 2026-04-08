const sql = require('mssql');
const poolPromise = require('../db');

const proveedoresController = {};

// ===============================
// LISTAR PROVEEDORES
// ===============================
proveedoresController.listar = async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT 
                IdProveedor,
                NombreProveedor,
                Telefono,
                CorreoElectronico,
                Direccion
            FROM Proveedores
            ORDER BY IdProveedor DESC
        `);

        res.render('proveedores/index', {
            proveedores: result.recordset,
            success: req.query.success || '',
            error: req.query.error || ''
        });

    } catch (error) {
        console.error('Error al listar proveedores:', error);
        res.redirect('/proveedores?error=error_servidor');
    }
};

// ===============================
// FORMULARIO NUEVO PROVEEDOR
// ===============================
proveedoresController.formNuevo = (req, res) => {
    res.render('proveedores/nuevo', {
        success: req.query.success || '',
        error: req.query.error || ''
    });
};

// ===============================
// CREAR PROVEEDOR
// ===============================
proveedoresController.crear = async (req, res) => {
    const { NombreProveedor, Telefono, CorreoElectronico, Direccion } = req.body;

    try {
        const pool = await poolPromise;

        await pool.request()
            .input('NombreProveedor', sql.VarChar(100), NombreProveedor)
            .input('Telefono', sql.VarChar(15), Telefono)
            .input('CorreoElectronico', sql.VarChar(100), CorreoElectronico)
            .input('Direccion', sql.VarChar(255), Direccion)
            .query(`
                INSERT INTO Proveedores
                (NombreProveedor, Telefono, CorreoElectronico, Direccion)
                VALUES
                (@NombreProveedor, @Telefono, @CorreoElectronico, @Direccion)
            `);

        res.redirect('/proveedores?success=proveedor_creado');

    } catch (error) {
        console.error('Error al crear proveedor:', error);
        res.redirect('/proveedores?error=error_servidor');
    }
};

// ===============================
// FORMULARIO EDITAR PROVEEDOR
// ===============================
proveedoresController.formEditar = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('IdProveedor', sql.Int, id)
            .query(`
                SELECT *
                FROM Proveedores
                WHERE IdProveedor = @IdProveedor
            `);

        if (result.recordset.length === 0) {
            return res.redirect('/proveedores?error=proveedor_no_encontrado');
        }

        res.render('proveedores/editar', {
            proveedor: result.recordset[0],
            success: req.query.success || '',
            error: req.query.error || ''
        });

    } catch (error) {
        console.error('Error al cargar proveedor:', error);
        res.redirect('/proveedores?error=error_servidor');
    }
};

// ===============================
// ACTUALIZAR PROVEEDOR
// ===============================
proveedoresController.actualizar = async (req, res) => {
    const { id } = req.params;
    const { NombreProveedor, Telefono, CorreoElectronico, Direccion } = req.body;

    try {
        const pool = await poolPromise;

        await pool.request()
            .input('IdProveedor', sql.Int, id)
            .input('NombreProveedor', sql.VarChar(100), NombreProveedor)
            .input('Telefono', sql.VarChar(15), Telefono)
            .input('CorreoElectronico', sql.VarChar(100), CorreoElectronico)
            .input('Direccion', sql.VarChar(255), Direccion)
            .query(`
                UPDATE Proveedores
                SET
                    NombreProveedor = @NombreProveedor,
                    Telefono = @Telefono,
                    CorreoElectronico = @CorreoElectronico,
                    Direccion = @Direccion
                WHERE IdProveedor = @IdProveedor
            `);

        res.redirect('/proveedores?success=proveedor_actualizado');

    } catch (error) {
        console.error('Error al actualizar proveedor:', error);
        res.redirect('/proveedores?error=error_servidor');
    }
};

// ===============================
// ELIMINAR PROVEEDOR
// ===============================
proveedoresController.eliminar = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await poolPromise;

        await pool.request()
            .input('IdProveedor', sql.Int, id)
            .query(`
                DELETE FROM Proveedores
                WHERE IdProveedor = @IdProveedor
            `);

        res.redirect('/proveedores?success=proveedor_eliminado');

    } catch (error) {
        console.error('Error al eliminar proveedor:', error);
        res.redirect('/proveedores?error=error_servidor');
    }
};

module.exports = proveedoresController;