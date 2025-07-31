-- =====================================================
-- POLÍTICAS RLS PARA SISTEMA DE GESTIÓN DE HORARIOS
-- =====================================================
-- Autor: Sistema de Seguridad
-- Fecha: 2025-01-29
-- Descripción: Políticas de seguridad para las tablas del sistema de horarios
-- Compatible con PostgreSQL 15+ y Supabase RLS
-- =====================================================

-- Función helper para verificar si un usuario es admin o owner
CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función helper para verificar si un usuario es barbero
CREATE OR REPLACE FUNCTION is_barber(p_barber_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_barber_id IS NULL THEN
        -- Verificar si el usuario actual es barbero
        RETURN EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'barber'
        );
    ELSE
        -- Verificar si el usuario actual es el barbero especificado
        RETURN auth.uid() = p_barber_id AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'barber'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función helper para verificar si un barbero pertenece a una barbería específica
CREATE OR REPLACE FUNCTION barber_belongs_to_barbershop(p_barber_id UUID, p_barbershop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM barbers
        WHERE profile_id = p_barber_id
        AND barbershop_id = p_barbershop_id
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =====================================================

ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_template_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exception_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_schedules_current ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA schedule_templates
-- =====================================================

-- Política de lectura: Todos pueden ver plantillas activas
CREATE POLICY "schedule_templates_select_all"
    ON schedule_templates FOR SELECT
    USING (
        -- Clientes solo ven plantillas activas
        (is_active = true) OR
        -- Barberos ven todas sus plantillas
        (barber_id = auth.uid() AND is_barber()) OR
        -- Admins y owners ven todo
        is_admin_or_owner() OR
        -- Owners de barbería ven plantillas de sus barberos
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON bs.id = b.barbershop_id
            WHERE b.profile_id = schedule_templates.barber_id
            AND bs.owner_id = auth.uid()
        )
    );

-- Política de inserción: Barberos pueden crear sus propias plantillas
CREATE POLICY "schedule_templates_insert_barber"
    ON schedule_templates FOR INSERT
    WITH CHECK (
        -- Barberos pueden crear sus propias plantillas
        (barber_id = auth.uid() AND is_barber()) OR
        -- Admins y owners pueden crear para cualquiera
        is_admin_or_owner() OR
        -- Owners pueden crear para sus barberos
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON bs.id = b.barbershop_id
            WHERE b.profile_id = barber_id
            AND bs.owner_id = auth.uid()
        )
    );

-- Política de actualización: Barberos pueden actualizar sus propias plantillas
CREATE POLICY "schedule_templates_update_barber"
    ON schedule_templates FOR UPDATE
    USING (
        -- Barberos pueden actualizar sus propias plantillas
        (barber_id = auth.uid() AND is_barber()) OR
        -- Admins y owners pueden actualizar cualquiera
        is_admin_or_owner() OR
        -- Owners pueden actualizar plantillas de sus barberos
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON bs.id = b.barbershop_id
            WHERE b.profile_id = schedule_templates.barber_id
            AND bs.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        -- No se puede cambiar el barber_id
        barber_id = OLD.barber_id
    );

-- Política de eliminación: Barberos pueden eliminar sus propias plantillas
CREATE POLICY "schedule_templates_delete_barber"
    ON schedule_templates FOR DELETE
    USING (
        -- Barberos pueden eliminar sus propias plantillas
        (barber_id = auth.uid() AND is_barber()) OR
        -- Admins y owners pueden eliminar cualquiera
        is_admin_or_owner() OR
        -- Owners pueden eliminar plantillas de sus barberos
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON bs.id = b.barbershop_id
            WHERE b.profile_id = schedule_templates.barber_id
            AND bs.owner_id = auth.uid()
        )
    );

-- =====================================================
-- POLÍTICAS PARA schedule_template_blocks
-- =====================================================

-- Política de lectura: Todos pueden ver bloques de plantillas activas
CREATE POLICY "schedule_template_blocks_select_all"
    ON schedule_template_blocks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM schedule_templates st
            WHERE st.id = schedule_template_blocks.template_id
            AND (
                -- Plantillas activas visibles para todos
                st.is_active = true OR
                -- Barberos ven bloques de sus plantillas
                (st.barber_id = auth.uid() AND is_barber()) OR
                -- Admins y owners ven todo
                is_admin_or_owner() OR
                -- Owners ven bloques de sus barberos
                EXISTS (
                    SELECT 1 FROM barbers b
                    JOIN barbershops bs ON bs.id = b.barbershop_id
                    WHERE b.profile_id = st.barber_id
                    AND bs.owner_id = auth.uid()
                )
            )
        )
    );

-- Política de inserción: Solo quien puede gestionar la plantilla puede añadir bloques
CREATE POLICY "schedule_template_blocks_insert"
    ON schedule_template_blocks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM schedule_templates st
            WHERE st.id = template_id
            AND (
                -- Barbero propietario
                (st.barber_id = auth.uid() AND is_barber()) OR
                -- Admins y owners
                is_admin_or_owner() OR
                -- Owner de la barbería
                EXISTS (
                    SELECT 1 FROM barbers b
                    JOIN barbershops bs ON bs.id = b.barbershop_id
                    WHERE b.profile_id = st.barber_id
                    AND bs.owner_id = auth.uid()
                )
            )
        )
    );

-- Política de actualización: Solo quien puede gestionar la plantilla puede actualizar bloques
CREATE POLICY "schedule_template_blocks_update"
    ON schedule_template_blocks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM schedule_templates st
            WHERE st.id = schedule_template_blocks.template_id
            AND (
                -- Barbero propietario
                (st.barber_id = auth.uid() AND is_barber()) OR
                -- Admins y owners
                is_admin_or_owner() OR
                -- Owner de la barbería
                EXISTS (
                    SELECT 1 FROM barbers b
                    JOIN barbershops bs ON bs.id = b.barbershop_id
                    WHERE b.profile_id = st.barber_id
                    AND bs.owner_id = auth.uid()
                )
            )
        )
    )
    WITH CHECK (
        -- No se puede cambiar el template_id
        template_id = OLD.template_id
    );

-- Política de eliminación: Solo quien puede gestionar la plantilla puede eliminar bloques
CREATE POLICY "schedule_template_blocks_delete"
    ON schedule_template_blocks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM schedule_templates st
            WHERE st.id = schedule_template_blocks.template_id
            AND (
                -- Barbero propietario
                (st.barber_id = auth.uid() AND is_barber()) OR
                -- Admins y owners
                is_admin_or_owner() OR
                -- Owner de la barbería
                EXISTS (
                    SELECT 1 FROM barbers b
                    JOIN barbershops bs ON bs.id = b.barbershop_id
                    WHERE b.profile_id = st.barber_id
                    AND bs.owner_id = auth.uid()
                )
            )
        )
    );

-- =====================================================
-- POLÍTICAS PARA schedule_exceptions
-- =====================================================

-- Política de lectura: Todos pueden ver excepciones de horario
CREATE POLICY "schedule_exceptions_select_all"
    ON schedule_exceptions FOR SELECT
    USING (
        -- Todos pueden ver excepciones futuras (para disponibilidad)
        exception_date >= CURRENT_DATE OR
        -- Barberos ven todas sus excepciones
        (barber_id = auth.uid() AND is_barber()) OR
        -- Admins y owners ven todo
        is_admin_or_owner() OR
        -- Owners ven excepciones de sus barberos
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON bs.id = b.barbershop_id
            WHERE b.profile_id = schedule_exceptions.barber_id
            AND bs.owner_id = auth.uid()
        )
    );

-- Política de inserción: Barberos pueden crear sus propias excepciones
CREATE POLICY "schedule_exceptions_insert"
    ON schedule_exceptions FOR INSERT
    WITH CHECK (
        -- Barberos pueden crear sus propias excepciones
        (barber_id = auth.uid() AND is_barber()) OR
        -- Admins y owners pueden crear para cualquiera
        is_admin_or_owner() OR
        -- Owners pueden crear para sus barberos
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON bs.id = b.barbershop_id
            WHERE b.profile_id = barber_id
            AND bs.owner_id = auth.uid()
        )
    );

-- Política de actualización: Barberos pueden actualizar sus propias excepciones
CREATE POLICY "schedule_exceptions_update"
    ON schedule_exceptions FOR UPDATE
    USING (
        -- Barberos pueden actualizar sus propias excepciones
        (barber_id = auth.uid() AND is_barber()) OR
        -- Admins y owners pueden actualizar cualquiera
        is_admin_or_owner() OR
        -- Owners pueden actualizar excepciones de sus barberos
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON bs.id = b.barbershop_id
            WHERE b.profile_id = schedule_exceptions.barber_id
            AND bs.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        -- No se puede cambiar el barber_id ni la fecha
        barber_id = OLD.barber_id AND
        exception_date = OLD.exception_date
    );

-- Política de eliminación: Barberos pueden eliminar sus propias excepciones futuras
CREATE POLICY "schedule_exceptions_delete"
    ON schedule_exceptions FOR DELETE
    USING (
        -- Solo se pueden eliminar excepciones futuras
        exception_date >= CURRENT_DATE AND (
            -- Barberos pueden eliminar sus propias excepciones
            (barber_id = auth.uid() AND is_barber()) OR
            -- Admins y owners pueden eliminar cualquiera
            is_admin_or_owner() OR
            -- Owners pueden eliminar excepciones de sus barberos
            EXISTS (
                SELECT 1 FROM barbers b
                JOIN barbershops bs ON bs.id = b.barbershop_id
                WHERE b.profile_id = schedule_exceptions.barber_id
                AND bs.owner_id = auth.uid()
            )
        )
    );

-- =====================================================
-- POLÍTICAS PARA schedule_exception_blocks
-- =====================================================

-- Política de lectura: Heredada de schedule_exceptions
CREATE POLICY "schedule_exception_blocks_select_all"
    ON schedule_exception_blocks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM schedule_exceptions se
            WHERE se.id = schedule_exception_blocks.exception_id
            AND (
                -- Excepciones futuras visibles para todos
                se.exception_date >= CURRENT_DATE OR
                -- Barberos ven bloques de sus excepciones
                (se.barber_id = auth.uid() AND is_barber()) OR
                -- Admins y owners ven todo
                is_admin_or_owner() OR
                -- Owners ven bloques de sus barberos
                EXISTS (
                    SELECT 1 FROM barbers b
                    JOIN barbershops bs ON bs.id = b.barbershop_id
                    WHERE b.profile_id = se.barber_id
                    AND bs.owner_id = auth.uid()
                )
            )
        )
    );

-- Política de inserción: Solo quien puede gestionar la excepción puede añadir bloques
CREATE POLICY "schedule_exception_blocks_insert"
    ON schedule_exception_blocks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM schedule_exceptions se
            WHERE se.id = exception_id
            AND (
                -- Barbero propietario
                (se.barber_id = auth.uid() AND is_barber()) OR
                -- Admins y owners
                is_admin_or_owner() OR
                -- Owner de la barbería
                EXISTS (
                    SELECT 1 FROM barbers b
                    JOIN barbershops bs ON bs.id = b.barbershop_id
                    WHERE b.profile_id = se.barber_id
                    AND bs.owner_id = auth.uid()
                )
            )
        )
    );

-- Política de actualización: Solo quien puede gestionar la excepción puede actualizar bloques
CREATE POLICY "schedule_exception_blocks_update"
    ON schedule_exception_blocks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM schedule_exceptions se
            WHERE se.id = schedule_exception_blocks.exception_id
            AND (
                -- Barbero propietario
                (se.barber_id = auth.uid() AND is_barber()) OR
                -- Admins y owners
                is_admin_or_owner() OR
                -- Owner de la barbería
                EXISTS (
                    SELECT 1 FROM barbers b
                    JOIN barbershops bs ON bs.id = b.barbershop_id
                    WHERE b.profile_id = se.barber_id
                    AND bs.owner_id = auth.uid()
                )
            )
        )
    )
    WITH CHECK (
        -- No se puede cambiar el exception_id
        exception_id = OLD.exception_id
    );

-- Política de eliminación: Solo quien puede gestionar la excepción puede eliminar bloques
CREATE POLICY "schedule_exception_blocks_delete"
    ON schedule_exception_blocks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM schedule_exceptions se
            WHERE se.id = schedule_exception_blocks.exception_id
            AND (
                -- Barbero propietario
                (se.barber_id = auth.uid() AND is_barber()) OR
                -- Admins y owners
                is_admin_or_owner() OR
                -- Owner de la barbería
                EXISTS (
                    SELECT 1 FROM barbers b
                    JOIN barbershops bs ON bs.id = b.barbershop_id
                    WHERE b.profile_id = se.barber_id
                    AND bs.owner_id = auth.uid()
                )
            )
        )
    );

-- =====================================================
-- POLÍTICAS PARA barber_schedules_current
-- =====================================================

-- Política de lectura: Todos pueden ver horarios actuales disponibles
CREATE POLICY "barber_schedules_current_select_all"
    ON barber_schedules_current FOR SELECT
    USING (
        -- Todos pueden ver horarios futuros (para reservar)
        schedule_date >= CURRENT_DATE OR
        -- Barberos ven todos sus horarios
        (barber_id = auth.uid() AND is_barber()) OR
        -- Admins y owners ven todo
        is_admin_or_owner() OR
        -- Owners ven horarios de sus barberos
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON bs.id = b.barbershop_id
            WHERE b.profile_id = barber_schedules_current.barber_id
            AND bs.owner_id = auth.uid()
        )
    );

-- IMPORTANTE: No se permiten operaciones INSERT, UPDATE o DELETE directas
-- Esta tabla se actualiza automáticamente mediante triggers

-- Política restrictiva para INSERT (solo sistema)
CREATE POLICY "barber_schedules_current_insert_system_only"
    ON barber_schedules_current FOR INSERT
    WITH CHECK (false);

-- Política restrictiva para UPDATE (solo sistema)
CREATE POLICY "barber_schedules_current_update_system_only"
    ON barber_schedules_current FOR UPDATE
    USING (false)
    WITH CHECK (false);

-- Política restrictiva para DELETE (solo sistema)
CREATE POLICY "barber_schedules_current_delete_system_only"
    ON barber_schedules_current FOR DELETE
    USING (false);

-- =====================================================
-- VALIDACIONES DE SEGURIDAD ADICIONALES
-- =====================================================

-- Función para validar que no se creen horarios solapados
CREATE OR REPLACE FUNCTION validate_schedule_blocks_no_overlap()
RETURNS TRIGGER AS $$
DECLARE
    v_overlap_count INTEGER;
BEGIN
    -- Para bloques de plantilla
    IF TG_TABLE_NAME = 'schedule_template_blocks' THEN
        SELECT COUNT(*)
        INTO v_overlap_count
        FROM schedule_template_blocks stb
        WHERE stb.template_id = NEW.template_id
        AND stb.day_of_week = NEW.day_of_week
        AND stb.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
        AND (
            (NEW.start_time >= stb.start_time AND NEW.start_time < stb.end_time) OR
            (NEW.end_time > stb.start_time AND NEW.end_time <= stb.end_time) OR
            (NEW.start_time <= stb.start_time AND NEW.end_time >= stb.end_time)
        );
    -- Para bloques de excepción
    ELSIF TG_TABLE_NAME = 'schedule_exception_blocks' THEN
        SELECT COUNT(*)
        INTO v_overlap_count
        FROM schedule_exception_blocks seb
        WHERE seb.exception_id = NEW.exception_id
        AND seb.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
        AND (
            (NEW.start_time >= seb.start_time AND NEW.start_time < seb.end_time) OR
            (NEW.end_time > seb.start_time AND NEW.end_time <= seb.end_time) OR
            (NEW.start_time <= seb.start_time AND NEW.end_time >= seb.end_time)
        );
    END IF;

    IF v_overlap_count > 0 THEN
        RAISE EXCEPTION 'Los bloques de horario no pueden solaparse';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers de validación
CREATE TRIGGER validate_template_blocks_no_overlap
    BEFORE INSERT OR UPDATE ON schedule_template_blocks
    FOR EACH ROW
    EXECUTE FUNCTION validate_schedule_blocks_no_overlap();

CREATE TRIGGER validate_exception_blocks_no_overlap
    BEFORE INSERT OR UPDATE ON schedule_exception_blocks
    FOR EACH ROW
    EXECUTE FUNCTION validate_schedule_blocks_no_overlap();

-- =====================================================
-- ÍNDICES DE SEGURIDAD Y RENDIMIENTO
-- =====================================================

-- Índices para mejorar el rendimiento de las políticas RLS
CREATE INDEX IF NOT EXISTS idx_schedule_templates_barber_active 
    ON schedule_templates(barber_id, is_active);

CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_barber_date 
    ON schedule_exceptions(barber_id, exception_date);

CREATE INDEX IF NOT EXISTS idx_barber_schedules_current_date_barber 
    ON barber_schedules_current(schedule_date, barber_id);

-- =====================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION is_admin_or_owner() IS 'Verifica si el usuario actual tiene rol de admin o owner';
COMMENT ON FUNCTION is_barber(UUID) IS 'Verifica si el usuario actual es barbero, opcionalmente verifica un ID específico';
COMMENT ON FUNCTION barber_belongs_to_barbershop(UUID, UUID) IS 'Verifica si un barbero pertenece a una barbería específica';
COMMENT ON FUNCTION validate_schedule_blocks_no_overlap() IS 'Previene la creación de bloques de horario solapados';

-- =====================================================
-- FIN DE POLÍTICAS RLS PARA SISTEMA DE HORARIOS
-- =====================================================