from PIL import Image, ImageDraw
import os

def generate_icon():
    source_path = 'public/fatoora-logo.png'
    dest_path = 'public/icon.png'
    
    # Target canvas size
    canvas_size = (1024, 1024)
    # Target icon size (approx 82% of canvas for standard macOS look)
    # This provides the necessary padding so the icon doesn't look "huge" in the dock
    icon_size = (840, 840)
    
    try:
        print(f"Opening {source_path}...")
        img = Image.open(source_path).convert("RGBA")
        
        # Resize image to fit within icon_size, maintaining aspect ratio
        img = img.resize(icon_size, Image.Resampling.LANCZOS)
        print(f"Resized image to {img.size}")
        
        # Create rounded mask
        mask = Image.new("L", icon_size, 0)
        draw = ImageDraw.Draw(mask)
        # Radius for rounded corners (approx 22% of size is standard for macOS)
        radius = int(icon_size[0] * 0.22)
        draw.rounded_rectangle([(0, 0), icon_size], radius=radius, fill=255)
        
        # Apply mask to image
        # Create a new image for the rounded result
        rounded_img = Image.new("RGBA", icon_size, (0, 0, 0, 0))
        rounded_img.paste(img, (0, 0), mask=mask)
        
        # Create transparent canvas
        canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
        
        # Calculate position to center
        x = (canvas_size[0] - rounded_img.width) // 2
        y = (canvas_size[1] - rounded_img.height) // 2
        
        # Paste rounded image onto canvas
        canvas.paste(rounded_img, (x, y), rounded_img) 
        
        canvas.save(dest_path)
        print(f"Successfully generated rounded, padded icon at {dest_path}")
        
    except Exception as e:
        print(f"Error generating icon: {e}")

if __name__ == "__main__":
    generate_icon()
