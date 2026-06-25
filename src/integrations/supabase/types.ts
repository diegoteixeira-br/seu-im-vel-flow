export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contracts: {
        Row: {
          adjustment_frequency_months: number
          adjustment_index: Database["public"]["Enums"]["adjustment_index"]
          created_at: string
          deposit_amount: number | null
          due_day: number
          end_date: string
          guarantee_months: number | null
          guarantee_type: Database["public"]["Enums"]["guarantee_type"]
          id: string
          notes: string | null
          property_id: string
          rent_amount: number
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adjustment_frequency_months?: number
          adjustment_index?: Database["public"]["Enums"]["adjustment_index"]
          created_at?: string
          deposit_amount?: number | null
          due_day?: number
          end_date: string
          guarantee_months?: number | null
          guarantee_type?: Database["public"]["Enums"]["guarantee_type"]
          id?: string
          notes?: string | null
          property_id: string
          rent_amount: number
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adjustment_frequency_months?: number
          adjustment_index?: Database["public"]["Enums"]["adjustment_index"]
          created_at?: string
          deposit_amount?: number | null
          due_day?: number
          end_date?: string
          guarantee_months?: number | null
          guarantee_type?: Database["public"]["Enums"]["guarantee_type"]
          id?: string
          notes?: string | null
          property_id?: string
          rent_amount?: number
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          property_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          property_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          property_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_photos: {
        Row: {
          category: Database["public"]["Enums"]["photo_category"]
          created_at: string
          id: string
          inspection_id: string
          notes: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["photo_category"]
          created_at?: string
          id?: string
          inspection_id: string
          notes?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["photo_category"]
          created_at?: string
          id?: string
          inspection_id?: string
          notes?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_photos_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          contract_id: string | null
          created_at: string
          general_notes: string | null
          id: string
          inspection_date: string
          property_id: string
          type: Database["public"]["Enums"]["inspection_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          general_notes?: string | null
          id?: string
          inspection_date?: string
          property_id: string
          type: Database["public"]["Enums"]["inspection_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          general_notes?: string | null
          id?: string
          inspection_date?: string
          property_id?: string
          type?: Database["public"]["Enums"]["inspection_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          asaas_invoice_url: string | null
          asaas_payment_id: string | null
          charge_sent_at: string | null
          contract_id: string
          created_at: string
          due_date: string
          id: string
          method: Database["public"]["Enums"]["payment_method"] | null
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          reference_month: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          charge_sent_at?: string | null
          contract_id: string
          created_at?: string
          due_date: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          reference_month: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          charge_sent_at?: string | null
          contract_id?: string
          created_at?: string
          due_date?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          reference_month?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_city: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_street: string | null
          address_uf: string | null
          address_zip: string | null
          asaas_api_key: string | null
          asaas_environment: string
          auto_charge_days_before: number
          auto_charge_enabled: boolean
          auto_charge_message: string | null
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          pix_key: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_street?: string | null
          address_uf?: string | null
          address_zip?: string | null
          asaas_api_key?: string | null
          asaas_environment?: string
          auto_charge_days_before?: number
          auto_charge_enabled?: boolean
          auto_charge_message?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          pix_key?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_street?: string | null
          address_uf?: string | null
          address_zip?: string | null
          asaas_api_key?: string | null
          asaas_environment?: string
          auto_charge_days_before?: number
          auto_charge_enabled?: boolean
          auto_charge_message?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          pix_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          area_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string
          id: string
          nickname: string
          notes: string | null
          rent_amount: number
          state: string | null
          status: Database["public"]["Enums"]["property_status"]
          type: Database["public"]["Enums"]["property_type"]
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address: string
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          id?: string
          nickname: string
          notes?: string | null
          rent_amount?: number
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          type?: Database["public"]["Enums"]["property_type"]
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          id?: string
          nickname?: string
          notes?: string | null
          rent_amount?: number
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          type?: Database["public"]["Enums"]["property_type"]
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      property_photos: {
        Row: {
          caption: string | null
          category: Database["public"]["Enums"]["photo_category"]
          created_at: string
          id: string
          property_id: string
          sort_order: number
          storage_path: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          category?: Database["public"]["Enums"]["photo_category"]
          created_at?: string
          id?: string
          property_id: string
          sort_order?: number
          storage_path: string
          user_id: string
        }
        Update: {
          caption?: string | null
          category?: Database["public"]["Enums"]["photo_category"]
          created_at?: string
          id?: string
          property_id?: string
          sort_order?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string | null
          file_path: string
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_name?: string | null
          file_path: string
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string | null
          file_path?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address_city: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          asaas_customer_id: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          guarantor_cpf: string | null
          guarantor_name: string | null
          guarantor_phone: string | null
          id: string
          marital_status: string | null
          notes: string | null
          occupation: string | null
          phone: string | null
          rg: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          asaas_customer_id?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          guarantor_cpf?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          id?: string
          marital_status?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          rg?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          asaas_customer_id?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          guarantor_cpf?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          id?: string
          marital_status?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          rg?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      adjustment_index: "nenhum" | "igpm" | "ipca"
      contract_status: "ativo" | "encerrado" | "cancelado" | "pendente"
      expense_category:
        | "manutencao"
        | "iptu"
        | "condominio"
        | "seguro"
        | "reforma"
        | "administracao"
        | "outro"
      guarantee_type: "sem_garantia" | "fiador" | "caucao" | "seguro_fianca"
      inspection_type: "entrada" | "saida"
      payment_method:
        | "pix"
        | "boleto"
        | "transferencia"
        | "dinheiro"
        | "cartao"
        | "outro"
      payment_status: "pendente" | "pago" | "atrasado" | "cancelado"
      photo_category:
        | "fachada"
        | "sala"
        | "quarto"
        | "cozinha"
        | "banheiro"
        | "area_externa"
        | "vistoria_entrada"
        | "vistoria_saida"
      property_status: "disponivel" | "alugado" | "manutencao" | "inativo"
      property_type:
        | "apartamento"
        | "casa"
        | "comercial"
        | "kitnet"
        | "terreno"
        | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      adjustment_index: ["nenhum", "igpm", "ipca"],
      contract_status: ["ativo", "encerrado", "cancelado", "pendente"],
      expense_category: [
        "manutencao",
        "iptu",
        "condominio",
        "seguro",
        "reforma",
        "administracao",
        "outro",
      ],
      guarantee_type: ["sem_garantia", "fiador", "caucao", "seguro_fianca"],
      inspection_type: ["entrada", "saida"],
      payment_method: [
        "pix",
        "boleto",
        "transferencia",
        "dinheiro",
        "cartao",
        "outro",
      ],
      payment_status: ["pendente", "pago", "atrasado", "cancelado"],
      photo_category: [
        "fachada",
        "sala",
        "quarto",
        "cozinha",
        "banheiro",
        "area_externa",
        "vistoria_entrada",
        "vistoria_saida",
      ],
      property_status: ["disponivel", "alugado", "manutencao", "inativo"],
      property_type: [
        "apartamento",
        "casa",
        "comercial",
        "kitnet",
        "terreno",
        "outro",
      ],
    },
  },
} as const
